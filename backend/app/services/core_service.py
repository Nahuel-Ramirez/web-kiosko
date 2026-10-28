from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import func, and_
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.cliente import Cliente
from app.models.cierre_caja import CierreCaja
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.models.venta import Venta, DetalleVenta
from app.schemas.core import (
    CierreCajaCreate,
    CierreCajaOut,
    ClienteCreate,
    ClienteUpdate,
    DetalleVentaCreate,
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
    like_doc = termino + "%"
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
    for field, value in datos.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
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
    Si algo falla no se guarda nada (rollback).
    """
    if not get_cliente(db, datos.cliente_id):
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

    try:
        venta = Venta(
            usuario_id=usuario_id,
            cliente_id=datos.cliente_id,
            total=datos.total,
            metodo_pago=datos.metodo_pago,
            monto_recibido=datos.monto_recibido,
            vuelto=datos.vuelto,
        )
        db.add(venta)
        db.flush()

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
    total_efectivo = sum((v.total for v in ventas if v.metodo_pago == "EFECTIVO"), Decimal("0"))
    total_tarjeta = sum((v.total for v in ventas if v.metodo_pago == "TARJETA"), Decimal("0"))
    return total_efectivo, total_tarjeta


def get_turno_actual(db: Session, usuario_id: int) -> dict:
    """Resumen del turno abierto (ventas aun sin cierre) calculado en el servidor."""
    ventas = get_ventas_abiertas(db, usuario_id)
    total_efectivo, total_tarjeta = _totales_ventas(ventas)
    return {
        "cantidad_ventas": len(ventas),
        "total_efectivo": total_efectivo,
        "total_tarjeta": total_tarjeta,
        "total_general": total_efectivo + total_tarjeta,
        "ventas": ventas,
    }


def create_cierre(db: Session, usuario_id: int, datos: CierreCajaCreate) -> CierreCaja:
    """Cierra el turno del usuario.

    Si hay ventas abiertas registradas en la base, las asocia al cierre y los
    totales se calculan en el servidor (no se confia en lo que manda el cliente).
    Si no hay ventas abiertas se conservan los totales enviados (compatibilidad
    con el frontend que aun calcula el turno de forma local).
    """
    ventas = get_ventas_abiertas(db, usuario_id)
    if ventas:
        total_efectivo, total_tarjeta = _totales_ventas(ventas)
        cantidad = len(ventas)
    else:
        total_efectivo, total_tarjeta = datos.total_efectivo, datos.total_tarjeta
        cantidad = datos.cantidad_ventas

    cierre = CierreCaja(
        usuario_id=usuario_id,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        cantidad_ventas=cantidad,
        observaciones=datos.observaciones,
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
    return cierre


def get_cierre(db: Session, cierre_id: int) -> Optional[CierreCaja]:
    return db.query(CierreCaja).filter(CierreCaja.id == cierre_id).first()


def get_cierres_by_usuario(db: Session, usuario_id: int) -> List[CierreCaja]:
    return db.query(CierreCaja).filter(CierreCaja.usuario_id == usuario_id).order_by(CierreCaja.fecha_cierre.desc()).all()


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

    ventas = get_ventas_by_cierre(db, cierre_id)

    total_general = sum(v.total for v in ventas)
    total_efectivo = sum(v.total for v in ventas if v.metodo_pago == "EFECTIVO")
    total_tarjeta = sum(v.total for v in ventas if v.metodo_pago == "TARJETA")

    return ResumenTurno(
        cierre=CierreCajaOut.model_validate(cierre),
        ventas=[VentaOut.model_validate(v) for v in ventas],
        total_general=total_general,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        cantidad_ventas=len(ventas),
    )


def get_reporte_ventas_periodo(
    db: Session, fecha_desde: datetime, fecha_hasta: datetime
) -> ReporteVentasPeriodo:
    # Ventas en el período
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
                "cierres": [],
            }
        por_usuario_dict[uid]["total_ventas"] += v.total
        por_usuario_dict[uid]["cantidad_ventas"] += 1
        if v.metodo_pago == "EFECTIVO":
            por_usuario_dict[uid]["total_efectivo"] += v.total
        else:
            por_usuario_dict[uid]["total_tarjeta"] += v.total

    # Cierres en el período
    cierres = (
        db.query(CierreCaja)
        .options(joinedload(CierreCaja.usuario))
        .filter(CierreCaja.fecha_cierre >= fecha_desde, CierreCaja.fecha_cierre <= fecha_hasta)
        .all()
    )
    for c in cierres:
        uid = c.usuario_id
        if uid in por_usuario_dict:
            por_usuario_dict[uid]["cierres"].append(CierreCajaOut.model_validate(c))

    por_usuario = [VentasPorUsuario(**v) for v in por_usuario_dict.values()]

    total_general = sum(v.total for v in ventas)
    total_efectivo = sum(v.total for v in ventas if v.metodo_pago == "EFECTIVO")
    total_tarjeta = sum(v.total for v in ventas if v.metodo_pago == "TARJETA")

    return ReporteVentasPeriodo(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        total_general=total_general,
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        cantidad_ventas=len(ventas),
        por_usuario=por_usuario,
    )