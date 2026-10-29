from datetime import date, datetime

from app.models.venta import Venta


def venta_payload(producto, cantidad=1, metodo="EFECTIVO", cliente_id=1):
    sub = float(producto["precio_venta"]) * cantidad
    return {
        "cliente_id": cliente_id, "total": sub, "metodo_pago": metodo,
        "detalles": [{"producto_id": producto["id"], "cantidad": cantidad,
                      "precio_unitario": producto["precio_venta"], "subtotal": sub}],
    }


# ---------- auth / roles ----------
def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_login_incorrecto(client):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "mal"}).status_code == 401


def test_endpoints_protegidos_sin_token(client):
    for url in ("/api/usuarios", "/api/productos", "/api/clientes", "/api/reportes/horas-pico"):
        assert client.get(url).status_code == 401


def test_cajero_no_puede_administrar(client, cajero_h):
    assert client.get("/api/usuarios", headers=cajero_h).status_code == 403
    r = client.post("/api/productos", headers=cajero_h, json={"codigo_barras": "1", "nombre": "x", "precio_costo": 1, "precio_venta": 2})
    assert r.status_code == 403
    r = client.get("/api/reportes/ventas-por-hora?fecha_desde=2026-01-01&fecha_hasta=2026-01-02", headers=cajero_h)
    assert r.status_code == 403


# ---------- usuarios ----------
def test_alta_cajero_y_login_con_dni(client, admin_h):
    r = client.post("/api/usuarios", headers=admin_h, json={"nombre": "Juan", "username": "30123456", "dni": "30123456", "password": "clave123", "rol": "cajero"})
    assert r.status_code == 201 and r.json()["rol"] == "CAJERO"
    assert client.post("/api/auth/login", json={"username": "30123456", "password": "clave123"}).status_code == 200
    dup = client.post("/api/usuarios", headers=admin_h, json={"nombre": "Otro", "username": "x", "dni": "30123456", "password": "clave123", "rol": "CAJERO"})
    assert dup.status_code == 400


def test_rol_invalido_rechazado(client, admin_h):
    r = client.post("/api/usuarios", headers=admin_h, json={"nombre": "X", "username": "x", "password": "p", "rol": "SUPERUSER"})
    assert r.status_code == 422


def test_cajero_desactivado_no_loguea(client, admin_h):
    uid = client.post("/api/usuarios", headers=admin_h, json={"nombre": "J", "username": "j", "password": "p123", "rol": "CAJERO"}).json()["id"]
    client.put("/api/usuarios/%s" % uid, headers=admin_h, json={"activo": False})
    assert client.post("/api/auth/login", json={"username": "j", "password": "p123"}).status_code == 401


# ---------- productos ----------
def test_producto_valores_negativos_rechazados(client, admin_h):
    r = client.post("/api/productos", headers=admin_h, json={"codigo_barras": "9", "nombre": "x", "precio_costo": -1, "precio_venta": 2})
    assert r.status_code == 422


def test_codigo_duplicado(client, admin_h, producto):
    r = client.post("/api/productos", headers=admin_h, json={"codigo_barras": "7790001", "nombre": "x", "precio_costo": 1, "precio_venta": 2})
    assert r.status_code == 400


# ---------- ventas ----------
def test_venta_descuenta_stock(client, cajero_h, admin_h, producto):
    r = client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 3))
    assert r.status_code == 201, r.text
    assert client.get("/api/productos/%s" % producto["id"], headers=admin_h).json()["stock_actual"] == 7


def test_venta_normaliza_metodo_pago(client, cajero_h, producto):
    r = client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, metodo="efectivo"))
    assert r.status_code == 201 and r.json()["metodo_pago"] == "EFECTIVO"
    r = client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, metodo="transferencia"))
    assert r.status_code == 201 and r.json()["metodo_pago"] == "TRANSFERENCIA"
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, metodo="cheque")).status_code == 422


def test_venta_stock_insuficiente_no_guarda_nada(client, cajero_h, admin_h, producto):
    r = client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 11))
    assert r.status_code == 409
    assert client.get("/api/productos/%s" % producto["id"], headers=admin_h).json()["stock_actual"] == 10
    assert client.get("/api/turnos/mis-ventas", headers=cajero_h).json() == []


def test_venta_lineas_repetidas_suman_para_validar_stock(client, cajero_h, producto):
    p = venta_payload(producto, 6)
    p["detalles"] = p["detalles"] * 2  # 6 + 6 = 12 > 10
    p["total"] = p["total"] * 2
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=p).status_code == 409


def test_venta_total_inconsistente_cliente_y_producto_inexistente(client, cajero_h, producto):
    p = venta_payload(producto, 1); p["total"] = 1
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=p).status_code == 400
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, cliente_id=999)).status_code == 400
    p = venta_payload(producto, 1); p["detalles"][0]["producto_id"] = 999
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=p).status_code == 400
    p = venta_payload(producto, 1); p["detalles"] = []
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=p).status_code == 422


# ---------- cierre de caja ----------
def test_cierre_vincula_ventas_y_calcula_en_servidor(client, cajero_h, admin_h, producto):
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 2, "EFECTIVO"))
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, "TARJETA"))
    turno = client.get("/api/turnos/turno-actual", headers=cajero_h).json()
    assert turno["cantidad_ventas"] == 2 and float(turno["total_general"]) == 540

    # el cliente intenta mentir con los totales: el servidor los ignora
    r = client.post("/api/turnos/cierre", headers=cajero_h, json={"total_efectivo": 99999, "total_tarjeta": 0, "cantidad_ventas": 50})
    assert r.status_code == 201
    c = r.json()
    assert float(c["total_efectivo"]) == 360 and float(c["total_tarjeta"]) == 180 and c["cantidad_ventas"] == 2

    resumen = client.get("/api/turnos/cierre/%s" % c["id"], headers=cajero_h).json()
    assert resumen["cantidad_ventas"] == 2
    assert client.get("/api/turnos/turno-actual", headers=cajero_h).json()["cantidad_ventas"] == 0


def test_transferencia_tiene_total_propio_en_turno_cierre_y_reporte(client, cajero_h, admin_h, producto):
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, "EFECTIVO"))
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1, "TARJETA"))
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 2, "TRANSFERENCIA"))
    turno = client.get("/api/turnos/turno-actual", headers=cajero_h).json()
    assert float(turno["total_transferencia"]) == 360 and float(turno["total_tarjeta"]) == 180
    assert float(turno["total_general"]) == 720

    c = client.post("/api/turnos/cierre", headers=cajero_h, json={}).json()
    assert float(c["total_transferencia"]) == 360 and float(c["total_tarjeta"]) == 180 and float(c["total_efectivo"]) == 180

    hoy = date.today().isoformat()
    rep = client.get("/api/turnos/reporte/periodo", headers=admin_h, params={"fecha_desde": hoy, "fecha_hasta": hoy}).json()
    assert float(rep["total_transferencia"]) == 360 and float(rep["total_tarjeta"]) == 180
    assert float(rep["por_usuario"][0]["total_transferencia"]) == 360
    assert float(rep["por_usuario"][0]["total_tarjeta"]) == 180


def test_venta_con_descuento_repartido_en_subtotales(client, cajero_h, producto):
    # Como lo arma la Caja: 5% de descuento repartido en el subtotal de cada linea.
    p = venta_payload(producto, 2)
    p["detalles"][0]["subtotal"] = "342.00"  # 360 - 18
    p["total"] = "342.00"
    assert client.post("/api/turnos/ventas", headers=cajero_h, json=p).status_code == 201


def test_cierre_sin_ventas_en_base_conserva_payload_legacy(client, cajero_h):
    r = client.post("/api/turnos/cierre", headers=cajero_h, json={"total_efectivo": 100, "total_tarjeta": 50, "cantidad_ventas": 3})
    assert r.status_code == 201 and r.json()["cantidad_ventas"] == 3


# ---------- reportes por fecha ----------
def test_reporte_hoy_incluye_todo_el_dia(client, cajero_h, admin_h, producto):
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1))
    hoy = date.today().isoformat()
    r = client.get("/api/turnos/reporte/periodo?fecha_desde=%s&fecha_hasta=%s" % (hoy, hoy), headers=admin_h)
    assert r.status_code == 200 and r.json()["cantidad_ventas"] == 1
    assert client.get("/api/turnos/mis-ventas?fecha_desde=%s&fecha_hasta=%s" % (hoy, hoy), headers=cajero_h).json() != []
    inv = client.get("/api/turnos/reporte/periodo?fecha_desde=2026-12-31&fecha_hasta=2026-01-01", headers=admin_h)
    assert inv.status_code == 400


# ---------- clientes ----------
def test_clientes_crud_y_busqueda(client, cajero_h, admin_h):
    r = client.post("/api/clientes", headers=cajero_h, json={"dni_cuit": "30111222", "razon_social": "Maria Gomez"})
    assert r.status_code == 201
    cid = r.json()["id"]
    assert client.post("/api/clientes", headers=cajero_h, json={"dni_cuit": "30111222", "razon_social": "Dup"}).status_code == 400
    client.post("/api/clientes", headers=cajero_h, json={"dni_cuit": "20301112223", "razon_social": "Kiosco SA"})

    busc = client.get("/api/clientes/buscar?dni=3011", headers=cajero_h).json()
    assert busc == [{"id": cid, "nombre": "Maria Gomez", "dni": "30111222", "cuit": None}]
    por_nombre = client.get("/api/clientes/buscar?dni=kiosco", headers=cajero_h).json()
    assert por_nombre[0]["cuit"] == "20301112223" and por_nombre[0]["dni"] is None

    assert client.put("/api/clientes/%s" % cid, headers=cajero_h, json={"razon_social": "x"}).status_code == 403
    assert client.put("/api/clientes/%s" % cid, headers=admin_h, json={"razon_social": "Maria G."}).status_code == 200
    assert client.put("/api/clientes/1", headers=admin_h, json={"razon_social": "x"}).status_code == 400
    assert client.delete("/api/clientes/1", headers=admin_h).status_code == 400
    assert client.delete("/api/clientes/%s" % cid, headers=admin_h).status_code == 204


def test_no_se_borra_lo_que_tiene_ventas(client, cajero_h, admin_h, producto):
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 1))
    assert client.delete("/api/productos/%s" % producto["id"], headers=admin_h).status_code == 409
    uid = client.get("/api/auth/me", headers=cajero_h).json()["id"]
    assert client.delete("/api/usuarios/%s" % uid, headers=admin_h).status_code == 409
    assert client.delete("/api/clientes/1", headers=admin_h).status_code == 400


# ---------- reportes de demanda / HU-09 ----------
def _ventas_en_hora(db, usuario_id, producto_id, hora, n, dia=None):
    from app.models.venta import DetalleVenta
    dia = dia or date.today()
    for _ in range(n):
        v = Venta(usuario_id=usuario_id, cliente_id=1, total=180, metodo_pago="EFECTIVO",
                  fecha=datetime(dia.year, dia.month, dia.day, hora, 15))
        db.add(v); db.flush()
        db.add(DetalleVenta(venta_id=v.id, producto_id=producto_id, cantidad=1, precio_unitario=180, subtotal=180))
    db.commit()


def test_ventas_por_hora_y_horas_pico(client, admin_h, db_session, producto):
    _ventas_en_hora(db_session, 1, producto["id"], 8, 1)
    _ventas_en_hora(db_session, 1, producto["id"], 12, 6)
    _ventas_en_hora(db_session, 1, producto["id"], 13, 5)
    _ventas_en_hora(db_session, 1, producto["id"], 18, 1)
    hoy = date.today().isoformat()
    q = "?fecha_desde=%s&fecha_hasta=%s" % (hoy, hoy)

    vh = client.get("/api/reportes/ventas-por-hora" + q, headers=admin_h).json()
    assert vh["total_ventas"] == 13
    assert [x["hora"] for x in vh["por_hora"]] == [8, 12, 13, 18]
    h12 = [x for x in vh["por_hora"] if x["hora"] == 12][0]
    assert h12["ventas"] == 6 and h12["items_top"] == ["Gaseosa 500ml"]

    hp = client.get("/api/reportes/horas-pico" + q, headers=admin_h).json()
    assert len(hp["horas_pico"]) == 1
    pico = hp["horas_pico"][0]
    assert (pico["hora_inicio"], pico["hora_fin"], pico["ventas_esperadas"]) == (12, 14, 11.0)
    tipos = [r["tipo"] for r in hp["recomendaciones"]]
    assert "cajero" in tipos and "stock" in tipos  # stock 10 < consumo esperado 11


def test_reportes_sin_datos(client, admin_h):
    q = "?fecha_desde=2020-01-01&fecha_hasta=2020-01-31"
    assert client.get("/api/reportes/ventas-por-hora" + q, headers=admin_h).json()["por_hora"] == []
    assert client.get("/api/reportes/horas-pico" + q, headers=admin_h).json() == {"horas_pico": [], "recomendaciones": []}


def test_productos_mas_vendidos(client, cajero_h, admin_h, producto):
    client.post("/api/productos", headers=admin_h, json={"codigo_barras": "2", "nombre": "Alfajor", "precio_costo": 50, "precio_venta": 100, "stock_actual": 50})
    alf = client.get("/api/productos/codigo/2", headers=admin_h).json()
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(producto, 2))
    client.post("/api/turnos/ventas", headers=cajero_h, json=venta_payload(alf, 5))
    rank = client.get("/api/reportes/productos-mas-vendidos?limite=5", headers=admin_h).json()
    assert [(r["nombre"], r["cantidad_vendida"]) for r in rank] == [("Alfajor", 5), ("Gaseosa 500ml", 2)]
    assert float(rank[0]["total_vendido"]) == 500
