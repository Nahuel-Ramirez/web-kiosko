from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import func, and_, case
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.cliente import Cliente
from app.models.cierre_caja import CierreCaja
from app.models.movimiento_fiado import MovimientoFiado
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.models.venta import Venta, DetalleVenta
from app.schemas.core import (
    CierreCajaCreate,
    CierreCajaOut,
    ClienteCreate,
    ClienteUpdate,
    DetalleVentaCreate,
    MovimientoFiadoOut,
    PagoFiadoCreate,
    ProductoCreate,
    ProductoUpdate,
    ReporteVentasPeriodo,
    ResumenTurno,
    UsuarioCreate,
    UsuarioUpdate,
    VentasPorUsuario,
    VentaOut,
    VentaCreate,
)


# ===== USUARIOS =====
def get_usuario(db: Session, usuario_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_usuario_by_username(db: Session, username: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.username == username).first()


def get_usuario_by_dni(db: Session, dni: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.dni == dni).first()


def get_usuarios(db: Session, skip: int = 0, limit: int = 100) -> List[Usuario]:
    return db.query(Usuario).offset(skip).limit(limit).all()


def create_usuario(db: Session, datos: UsuarioCreate) -> Usuario:
    usuario = Usuario(
        nombre=datos.nombre,
        username=datos.username,
        password_hash=hash_password(datos.password),
        rol=datos.rol,
        activo=datos.activo,
        dni=datos.dni,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def update_usuario(db: Session, usuario_id: int, datos: UsuarioUpdate) -> Optional[Usuario]:
    usuario = get_usuario(db, usuario_id)
    if not usuario:
        return None
    update_data = datos.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(usuario, field, value)
    db.commit()
    db.refresh(usuario)
    return usuario


def delete_usuario(db: Session, usuario_id: int) -> bool:
    usuario = get_usuario(db, usuario_id)
    if not usuario:
        return False
    if (
        db.query(Venta).filter(Venta.usuario_id == usuario_id).first()
        or db.query(CierreCaja).filter(CierreCaja.usuario_id == usuario_id).first()
        or db.query(MovimientoFiado).filter(MovimientoFiado.usuario_id == usuario_id).first()
    ):
        raise ReglaNegocioError("El usuario tiene ventas registradas; desactivalo en lugar de eliminarlo", status_code=409)
    db.delete(usuario)
    db.commit()
    return True


# ===== CLIENTES =====
def get_clientes(db: Session, skip: int = 0, limit: int = 100) -> List[Cliente]:
    return db.query(Cliente).offset(skip).limit(limit).all()


def get_cliente(db: Session, cliente_id: int) -> Optional[Cliente]:
    return db.query(Cliente).filter(Cliente.id == cliente_id).first()


def get_cliente_by_dni(db: Session, dni_cuit: str) -> Optional[Cliente]:
    return db.query(Cliente).filter(Cliente.dni_cuit == dni_cuit).first()


def buscar_clientes(db: Session, termino: str, limite: int = 10) -> List[Cliente]:
    """Busca por DNI/CUIT (prefijo) o por razon social (contiene)."""
    termino = termino.strip()
    # Los documentos se guardan sin puntos ni guiones: "20-1234" tambien encuentra "201234...".
    doc = termino.replace(".", "").replace("-", "").replace(" ", "")
    like_doc = (doc if doc.isdigit() else termino) + "%"
    like_nombre = "%" + termino + "%"
    return (
        db.query(Cliente)
        .filter((Cliente.dni_cuit.like(like_doc)) | (Cliente.razon_social.ilike(like_nombre)))
        .order_by(Cliente.razon_social.asc())
        .limit(limite)
        .all()
    )


def create_cliente(db: Session, datos: ClienteCreate) -> Cliente:
    cliente = Cliente(**datos.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


def update_cliente(db: Session, cliente_id: int, datos: ClienteUpdate) -> Optional[Cliente]:
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        return None
    cambios = datos.model_dump(exclude_unset=True)
    for field, value in cambios.items():
        setattr(cliente, field, value)
    # Para una persona, razon_social sigue siendo "Apellido Nombre" aunque cambie alguno de los dos.
    if ("nombre" in cambios or "apellido" in cambios) and cliente.nombre and cliente.apellido:
        cliente.razon_social = "%s %s" % (cliente.apellido.strip(), cliente.nombre.strip())
    db.commit()
    db.refresh(cliente)
    return cliente


def delete_cliente(db: Session, cliente_id: int) -> bool:
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        return False
    if db.query(Venta).filter(Venta.cliente_id == cliente_id).first():
        raise ReglaNegocioError("El cliente tiene ventas registradas; no se puede eliminar", status_code=409)
    db.delete(cliente)
    db.commit()
    return True


# ===== PRODUCTOS =====
def get_productos(db: Session, skip: int = 0, limit: int = 100) -> List[Producto]:
    return db.query(Producto).offset(skip).limit(limit).all()


def get_producto(db: Session, producto_id: int) -> Optional[Producto]:
    return db.query(Producto).filter(Producto.id == producto_id).first()


def get_producto_by_codigo(db: Session, codigo_barras: str) -> Optional[Producto]:
    return db.query(Producto).filter(Producto.codigo_barras == codigo_barras).first()


def create_producto(db: Session, datos: ProductoCreate) -> Producto:
    producto = Producto(**datos.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def update_producto(db: Session, producto_id: int, datos: ProductoUpdate) -> Optional[Producto]:
    producto = get_producto(db, producto_id)
    if not producto:
        return None
    for field, value in datos.model_dump(exclude_unset=True).items():
        setattr(producto, field, value)
    db.commit()
    db.refresh(producto)
    return producto


def delete_producto(db: Session, producto_id: int) -> bool:
    producto = get_producto(db, producto_id)
    if not producto:
        return False
    if db.query(DetalleVenta).filter(DetalleVenta.producto_id == producto_id).first():
        raise ReglaNegocioError("El producto tiene ventas registradas; no se puede eliminar", status_code=409)
    db.delete(producto)
    db.commit()
    return True


# ===== VENTAS =====
class ReglaNegocioError(Exception):
    """Error de regla de negocio (se traduce a HTTP 400/409 en los routers)."""

    def __init__(self, mensaje: str, status_code: int = 400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status_code = status_code


def create_venta(db: Session, usuario_id: int, datos: VentaCreate) -> Venta:
    """Registra una venta de forma atomica.

    Valida: cliente existente, productos existentes, stock suficiente (sumando
    lineas repetidas del mismo producto) y que el total coincida con el detalle.
    Si es FIADO valida ademas el cliente y su limite, y guarda el movimiento de
    deuda en la misma transaccion. Si algo falla no se guarda nada (rollback).
    """
    es_fiado = datos.metodo_pago == "FIADO"
    if es_fiado:
        cliente = _get_cliente_bloqueado(db, datos.cliente_id)
    else:
        cliente = get_cliente(db, datos.cliente_id)
    if not cliente:
        raise ReglaNegocioError("El cliente indicado no existe")

    # Cantidad total pedida por producto (una misma venta puede repetir lineas)
    pedido: dict = {}
    for det in datos.detalles:
        pedido[det.producto_id] = pedido.get(det.producto_id, 0) + det.cantidad

    productos = {}
    for producto_id, cantidad in pedido.items():
        producto = get_producto(db, producto_id)
        if not producto:
            raise ReglaNegocioError("El producto %s no existe" % producto_id)
        if producto.stock_actual < cantidad:
            raise ReglaNegocioError(
                "Stock insuficiente para '%s' (disponible: %s, pedido: %s)"
                % (producto.nombre, producto.stock_actual, cantidad),
                status_code=409,
            )
        productos[producto_id] = producto

    suma_detalle = sum(det.subtotal for det in datos.detalles)
    if suma_detalle != datos.total:
        raise ReglaNegocioError(
            "El total (%s) no coincide con la suma del detalle (%s)" % (datos.total, suma_detalle)
        )

    if es_fiado:
        _validar_fiado(db, cliente, datos.total)

    try:
        venta = Venta(
            usuario_id=usuario_id,
            cliente_id=datos.cliente_id,
            total=datos.total,
            metodo_pago=datos.metodo_pago,
            # En una venta fiada no se cobra nada en el momento.
            monto_recibido=None if es_fiado else datos.monto_recibido,
            vuelto=None if es_fiado else datos.vuelto,
        )
        db.add(venta)
        db.flush()

        if es_fiado:
            db.add(
                MovimientoFiado(
                    cliente_id=cliente.id,
                    usuario_id=usuario_id,
                    venta_id=venta.id,
                    tipo="VENTA",
                    monto=datos.total,
                )
            )

        for det in datos.detalles:
            db.add(
                DetalleVenta(
                    venta_id=venta.id,
                    producto_id=det.producto_id,
                    cantidad=det.cantidad,
                    precio_unitario=det.precio_unitario,
                    subtotal=det.subtotal,
                )
            )

        for producto_id, cantidad in pedido.items():
            productos[producto_id].stock_actual -= cantidad

        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(venta)
    return venta


def get_ventas_by_usuario(
    db: Session, usuario_id: int, fecha_desde: Optional[datetime] = None, fecha_hasta: Optional[datetime] = None
) -> List[Venta]:
    query = db.query(Venta).options(joinedload(Venta.detalles).joinedload(DetalleVenta.producto)).filter(Venta.usuario_id == usuario_id)
    if fecha_desde:
        query = query.filter(Venta.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Venta.fecha <= fecha_hasta)
    return query.order_by(Venta.fecha.desc()).all()


def get_ventas_by_cierre(db: Session, cierre_id: int) -> List[Venta]:
    return (
        db.query(Venta)
        .options(joinedload(Venta.detalles).joinedload(DetalleVenta.producto))
        .filter(Venta.cierre_id == cierre_id)
        .order_by(Venta.fecha.desc())
        .all()
    )


# ===== CIERRES DE CAJA =====
def get_ventas_abiertas(db: Session, usuario_id: int) -> List[Venta]:
    """Ventas del usuario que todavia no pertenecen a ningun cierre de caja."""
    return (
        db.query(Venta)
        .filter(Venta.usuario_id == usuario_id, Venta.cierre_id.is_(None))
        .order_by(Venta.fecha.asc())
        .all()
    )


def _totales_ventas(ventas: List[Venta]):
    """Devuelve (efectivo, tarjeta, transferencia) sumando el total de cada venta."""
    total_efectivo = sum((v.total for v in ventas if v.metodo_pago == "EFECTIVO"), Decimal("0"))
    total_tarjeta = sum((v.total for v in ventas if v.metodo_pago == "TARJETA"), Decimal("0"))
    total_transferencia = sum((v.total for v in ventas if v.metodo_pago == "TRANSFERENCIA"), Decimal("0"))
    return total_efectivo, total_tarjeta, total_transferencia


def get_turno_actual(db: Session, usuario_id: int) -> dict:
    """Resumen del turno abierto (ventas aun sin cierre) calculado en el servidor."""
    ventas = get_ventas_abiertas(db, usuario_id)
    total_efectivo, total_tarjeta, total_transferencia = _totales_ventas(ventas)
    return {
        "cantidad_ventas": len(ventas),
        "total_efectivo": total_efectivo,
        "total_tarjeta": total_tarjeta,
        "total_transferencia": total_transferencia,
        "total_general": total_efectivo + total_tarjeta + total_transferencia,
        "ventas": ventas,
    }


def create_cierre(db: Session, usuario_id: int, datos: CierreCajaCreate) -> CierreCaja:
    """Cierra el turno del usuario con arqueo de caja obligatorio.

    Si hay ventas abiertas registradas en la base, las asocia al cierre y los
    totales se calculan en el servidor (no se confia en lo que manda el cliente).
    Si no hay ventas abiertas se conservan los totales enviados (compatibilidad
    con el frontend que aun calcula el turno de forma local).

    El arqueo (monto_inicial, efectivo_contado) es obligatorio.
    La diferencia se calcula en la BD: efectivo_contado - monto_inicial - total_efectivo
    """
    import sys
    print("DEBUG service: datos.monto_inicial=" + str(datos.monto_inicial) + ", datos.efectivo_contado=" + str(datos.efectivo_contado), file=sys.stderr, flush=True)
    ventas = get_ventas_abiertas(db, usuario_id)
    if ventas:
        total_efectivo, total_tarjeta, total_transferencia = _totales_ventas(ventas)
        cantidad = len(ventas)
    else:
        total_efectivo, total_tarjeta = datos.total_efectivo, datos.total_tarjeta
        total_transferencia = datos.total_transferencia
        cantidad = datos.cantidad_ventas

    # Validar arqueo obligatorio
    if datos.efectivo_contado is None:
        from app.services.core_service import ReglaNegocioError
        raise ReglaNegocioError("El arqueo de caja es obligatorio: debe indicar efectivo_contado", status_code=400)

    cierre = CierreCaja(
        usuario_id=usuario_id,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        total_transferencia=total_transferencia,
        cantidad_ventas=cantidad,
        observaciones=datos.observaciones,
        monto_inicial=datos.monto_inicial,
        efectivo_contado=datos.efectivo_contado,
    )
    try:
        db.add(cierre)
        db.flush()
        for venta in ventas:
            venta.cierre_id = cierre.id
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(cierre)
    # Poblar diferencia: intentar leer de BD (PostgreSQL), si falla calcular en Python (SQLite)
    _set_diferencia(db, cierre)
    return cierre


def _set_diferencia(db: Session, cierre: CierreCaja) -> None:
    """Intenta leer 'diferencia' de la BD; si la columna no existe (SQLite), la calcula en Python."""
    from sqlalchemy import text
    try:
        result = db.execute(text("SELECT diferencia FROM cierres_caja WHERE id = :id"), {"id": cierre.id})
        row = result.fetchone()
        if row and row[0] is not None:
            cierre.diferencia = row[0]
        else:
            # Fallback: calcular en Python (para SQLite o si BD no tiene el dato)
            cierre.diferencia = _calcular_diferencia(cierre)
    except Exception:
        # Columna no existe en BD (SQLite sin GENERATED column) -> calcular en Python
        cierre.diferencia = _calcular_diferencia(cierre)


def _calcular_diferencia(cierre: CierreCaja) -> Optional[Decimal]:
    """Misma formula que la columna GENERATED de init.sql: sin conteo de efectivo (cierres
    anteriores al arqueo) la diferencia es NULL, no un faltante por el total vendido."""
    if cierre.efectivo_contado is None:
        return None
    return cierre.efectivo_contado - (cierre.monto_inicial or 0) - (cierre.total_efectivo or 0)

def get_cierre(db: Session, cierre_id: int) -> Optional[CierreCaja]:
    cierre = db.query(CierreCaja).filter(CierreCaja.id == cierre_id).first()
    if cierre:
        _set_diferencia(db, cierre)
    return cierre


def get_cierres_by_usuario(db: Session, usuario_id: int) -> List[CierreCaja]:
    cierres = db.query(CierreCaja).filter(CierreCaja.usuario_id == usuario_id).order_by(CierreCaja.fecha_cierre.desc()).all()
    # Poblar diferencia en cada cierre
    for c in cierres:
        _set_diferencia(db, c)
    return cierres


def get_ultimo_cierre_abierto(db: Session, usuario_id: int) -> Optional[CierreCaja]:
    return (
        db.query(CierreCaja)
        .filter(CierreCaja.usuario_id == usuario_id)
        .order_by(CierreCaja.fecha_cierre.desc())
        .first()
    )


# ===== REPORTES =====
def get_resumen_turno(db: Session, cierre_id: int) -> Optional[ResumenTurno]:
    cierre = get_cierre(db, cierre_id)
    if not cierre:
        return None

    # get_cierre ya llama a _set_diferencia

    ventas = get_ventas_by_cierre(db, cierre_id)

    total_general = sum(v.total for v in ventas)
    total_efectivo, total_tarjeta, total_transferencia = _totales_ventas(ventas)

    return ResumenTurno(
        cierre=CierreCajaOut.model_validate(cierre),
        ventas=[VentaOut.model_validate(v) for v in ventas],
        total_general=total_general,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        total_transferencia=total_transferencia,
        cantidad_ventas=len(ventas),
    )


def get_reporte_ventas_periodo(
    db: Session, fecha_desde: datetime, fecha_hasta: datetime
) -> ReporteVentasPeriodo:
    # Ventas en el per�odo
    ventas = (
        db.query(Venta)
        .options(joinedload(Venta.usuario))
        .filter(Venta.fecha >= fecha_desde, Venta.fecha <= fecha_hasta)
        .all()
    )

    # Agrupar por usuario
    por_usuario_dict = {}
    for v in ventas:
        uid = v.usuario_id
        if uid not in por_usuario_dict:
            por_usuario_dict[uid] = {
                "usuario_id": uid,
                "usuario_nombre": v.usuario.nombre,
                "usuario_username": v.usuario.username,
                "total_ventas": Decimal("0"),
                "cantidad_ventas": 0,
                "total_efectivo": Decimal("0"),
                "total_tarjeta": Decimal("0"),
                "total_transferencia": Decimal("0"),
                "cierres": [],
            }
        por_usuario_dict[uid]["total_ventas"] += v.total
        por_usuario_dict[uid]["cantidad_ventas"] += 1
        if v.metodo_pago == "EFECTIVO":
            por_usuario_dict[uid]["total_efectivo"] += v.total
        elif v.metodo_pago == "TRANSFERENCIA":
            por_usuario_dict[uid]["total_transferencia"] += v.total
        elif v.metodo_pago == "TARJETA":
            por_usuario_dict[uid]["total_tarjeta"] += v.total

    # Cierres en el per�odo
    cierres = (
        db.query(CierreCaja)
        .options(joinedload(CierreCaja.usuario))
        .filter(CierreCaja.fecha_cierre >= fecha_desde, CierreCaja.fecha_cierre <= fecha_hasta)
        .all()
    )
    # Poblar diferencia en cada cierre
    for c in cierres:
        _set_diferencia(db, c)
    for c in cierres:
        uid = c.usuario_id
        if uid in por_usuario_dict:
            por_usuario_dict[uid]["cierres"].append(CierreCajaOut.model_validate(c))

    por_usuario = [VentasPorUsuario(**v) for v in por_usuario_dict.values()]

    total_general = sum(v.total for v in ventas)
    total_efectivo, total_tarjeta, total_transferencia = _totales_ventas(ventas)

    return ReporteVentasPeriodo(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        total_general=total_general,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        total_transferencia=total_transferencia,
        cantidad_ventas=len(ventas),
        por_usuario=por_usuario,
    )


# ===== FIADO =====
CONSUMIDOR_FINAL_ID = 1


def _dinero(valor) -> Decimal:
    return Decimal(str(valor if valor is not None else 0)).quantize(Decimal("0.01"))


def _get_cliente_bloqueado(db: Session, cliente_id: int) -> Optional[Cliente]:
    """Lee el cliente bloqueando su fila hasta el commit: dos operaciones de fiado
    simultaneas del mismo cliente no pueden pasarse del limite entre las dos."""
    return db.query(Cliente).filter(Cliente.id == cliente_id).with_for_update().first()


def _monto_con_signo():
    return case((MovimientoFiado.tipo == "VENTA", MovimientoFiado.monto), else_=-MovimientoFiado.monto)


def get_saldo_fiado(db: Session, cliente_id: int) -> Decimal:
    """Lo que debe el cliente: ventas fiadas menos pagos (la misma cuenta que vista_saldos_fiado)."""
    saldo = db.query(func.sum(_monto_con_signo())).filter(MovimientoFiado.cliente_id == cliente_id).scalar()
    return _dinero(saldo)


def _validar_fiado(db: Session, cliente: Cliente, total: Decimal) -> None:
    if cliente.id == CONSUMIDOR_FINAL_ID:
        raise ReglaNegocioError("No se puede fiar a Consumidor Final: elegi un cliente")
    if not cliente.activo:
        raise ReglaNegocioError("El cliente esta dado de baja y no puede llevar fiado")
    if total <= 0:
        raise ReglaNegocioError("Una venta fiada tiene que tener un total mayor a 0")
    saldo = get_saldo_fiado(db, cliente.id)
    limite = _dinero(cliente.limite_fiado)
    if saldo + total > limite:
        raise ReglaNegocioError(
            "La venta supera el limite de fiado de %s (debe %s, limite %s, disponible %s)"
            % (cliente.razon_social, saldo, limite, limite - saldo),
            status_code=409,
        )


def registrar_pago_fiado(db: Session, cliente_id: int, usuario_id: int, datos: PagoFiadoCreate) -> Optional[dict]:
    """Registra un pago de deuda. Por ahora queda solo en movimientos_fiado: no entra
    en la caja del turno ni en el arqueo."""
    cliente = _get_cliente_bloqueado(db, cliente_id)
    if not cliente:
        return None
    saldo = get_saldo_fiado(db, cliente_id)
    if datos.monto > saldo:
        raise ReglaNegocioError("El pago (%s) supera lo que debe el cliente (%s)" % (datos.monto, saldo))

    movimiento = MovimientoFiado(
        cliente_id=cliente_id,
        usuario_id=usuario_id,
        tipo="PAGO",
        monto=datos.monto,
        observaciones=datos.observaciones,
    )
    try:
        db.add(movimiento)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(movimiento)
    return dict(MovimientoFiadoOut.model_validate(movimiento).model_dump(), saldo=saldo - datos.monto)


def get_cuenta_fiado(db: Session, cliente_id: int) -> Optional[dict]:
    """Saldo del cliente y sus movimientos de fiado, del mas nuevo al mas viejo."""
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        return None
    movimientos = (
        db.query(MovimientoFiado)
        .filter(MovimientoFiado.cliente_id == cliente_id)
        .order_by(MovimientoFiado.fecha.desc(), MovimientoFiado.id.desc())
        .all()
    )
    saldo = _dinero(sum((m.monto if m.tipo == "VENTA" else -m.monto for m in movimientos), Decimal("0")))
    limite = _dinero(cliente.limite_fiado)
    return {
        "cliente_id": cliente.id,
        "razon_social": cliente.razon_social,
        "limite_fiado": limite,
        "saldo": saldo,
        "disponible": limite - saldo,
        "movimientos": movimientos,
    }


def get_deudores(db: Session) -> List[dict]:
    """Clientes que deben algo, de mayor a menor deuda."""
    saldo = func.sum(_monto_con_signo())
    filas = (
        db.query(Cliente, saldo.label("saldo"), func.max(MovimientoFiado.fecha).label("ultimo_movimiento"))
        .join(MovimientoFiado, MovimientoFiado.cliente_id == Cliente.id)
        .group_by(Cliente.id)
        .having(saldo > 0)
        .order_by(saldo.desc(), Cliente.razon_social.asc())
        .all()
    )
    deudores = []
    for cliente, saldo_cliente, ultimo in filas:
        limite = _dinero(cliente.limite_fiado)
        saldo_cliente = _dinero(saldo_cliente)
        deudores.append({
            "cliente_id": cliente.id,
            "razon_social": cliente.razon_social,
            "dni_cuit": cliente.dni_cuit,
            "telefono": cliente.telefono,
            "activo": cliente.activo,
            "limite_fiado": limite,
            "saldo": saldo_cliente,
            "disponible": limite - saldo_cliente,
            "ultimo_movimiento": ultimo,
        })
    return deudores








