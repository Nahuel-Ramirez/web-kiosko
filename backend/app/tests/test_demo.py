from datetime import datetime

import pytest

from app.db import demo
from app.models.cierre_caja import CierreCaja
from app.models.cliente import Cliente
from app.models.producto import Producto
from app.models.venta import DetalleVenta, Venta

AHORA = datetime(2026, 11, 4, 15, 30)


def test_carga_datos_consistentes(db_session):
    r = demo.cargar(db_session, dias=3, ahora=AHORA)
    assert r["productos"] == len(demo.PRODUCTOS) and r["clientes"] == len(demo.CLIENTES)
    assert r["ventas"] > 0 and r["cierres"] > 0

    for v in db_session.query(Venta).all():
        # mismas reglas que exige POST /api/turnos/ventas
        assert v.detalles and v.total == sum(d.subtotal for d in v.detalles)
        assert v.vuelto >= 0 and v.metodo_pago in ("EFECTIVO", "TARJETA", "TRANSFERENCIA")
        assert v.fecha <= AHORA

    # las ventas de hoy quedan abiertas (sin cierre) y las de dias anteriores, cerradas
    abiertas = db_session.query(Venta).filter(Venta.cierre_id.is_(None)).all()
    assert abiertas and all(v.fecha.date() == AHORA.date() for v in abiertas)
    for c in db_session.query(CierreCaja).all():
        ventas = db_session.query(Venta).filter(Venta.cierre_id == c.id).all()
        assert c.cantidad_ventas == len(ventas)
        assert c.total_efectivo == sum(v.total for v in ventas if v.metodo_pago == "EFECTIVO")
        assert c.efectivo_contado is not None and c.monto_inicial == demo.MONTO_INICIAL


def test_no_carga_dos_veces(db_session):
    demo.cargar(db_session, dias=1, ahora=AHORA)
    with pytest.raises(ValueError):
        demo.cargar(db_session, dias=1, ahora=AHORA)


def test_borrar_deja_solo_lo_que_no_es_de_ejemplo(db_session):
    real = Producto(codigo_barras="123", nombre="Producto real", precio_costo=1, precio_venta=2, stock_actual=5)
    db_session.add(real)
    db_session.commit()

    demo.cargar(db_session, dias=2, ahora=AHORA)
    demo.borrar(db_session)

    assert [p.codigo_barras for p in db_session.query(Producto).all()] == ["123"]
    assert [c.dni_cuit for c in db_session.query(Cliente).all()] == ["0"]  # Consumidor Final
    assert db_session.query(Venta).count() == 0 and db_session.query(DetalleVenta).count() == 0
    assert db_session.query(CierreCaja).count() == 0
    assert not demo.hay_datos_demo(db_session)
