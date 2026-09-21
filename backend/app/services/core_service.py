from datetime import datetime
from decimal import Decimal
from typing import Optional
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
    VentaCreate,
)


# ===== USUARIOS =====
def get_usuario(db: Session, usuario_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_usuario_by_username(db: Session, username: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.username == username).first()


def get_usuarios(db: Session, skip: int = 0, limit: int = 100) -> list[Usuario]:
    return db.query(Usuario).offset(skip).limit(limit).all()


def create_usuario(db: Session, datos: UsuarioCreate) -> Usuario:
    usuario = Usuario(
        nombre=datos.nombre,
        username=datos.username,
        password_hash=hash_password(datos.password),
        rol=datos.rol,
        activo=datos.activo,
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
    db.delete(usuario)
    db.commit()
    return True


# ===== CLIENTES =====
def get_clientes(db: Session, skip: int = 0, limit: int = 100) -> list[Cliente]:
    return db.query(Cliente).offset(skip).limit(limit).all()


def get_cliente(db: Session, cliente_id: int) -> Optional[Cliente]:
    return db.query(Cliente).filter(Cliente.id == cliente_id).first()


def get_cliente_by_dni(db: Session, dni_cuit: str) -> Optional[Cliente]:
    return db.query(Cliente).filter(Cliente.dni_cuit == dni_cuit).first()


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
    db.delete(cliente)
    db.commit()
    return True


# ===== PRODUCTOS =====
def get_productos(db: Session, skip: int = 0, limit: int = 100) -> list[Producto]:
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
    db.delete(producto)
    db.commit()
    return True


# ===== VENTAS =====
def create_venta(db: Session, usuario_id: int, datos: VentaCreate) -> Venta:
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
        detalle = DetalleVenta(
            venta_id=venta.id,
            producto_id=det.producto_id,
            cantidad=det.cantidad,
            precio_unitario=det.precio_unitario,
            subtotal=det.subtotal,
        )
        db.add(detalle)

        # Descontar stock
        producto = get_producto(db, det.producto_id)
        if producto:
            producto.stock_actual -= det.cantidad

    db.commit()
    db.refresh(venta)
    return venta


def get_ventas_by_usuario(
    db: Session, usuario_id: int, fecha_desde: Optional[datetime] = None, fecha_hasta: Optional[datetime] = None
) -> list[Venta]:
    query = db.query(Venta).options(joinedload(Venta.detalles).joinedload(DetalleVenta.producto)).filter(Venta.usuario_id == usuario_id)
    if fecha_desde:
        query = query.filter(Venta.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Venta.fecha <= fecha_hasta)
    return query.order_by(Venta.fecha.desc()).all()


def get_ventas_by_cierre(db: Session, cierre_id: int) -> list[Venta]:
    return (
        db.query(Venta)
        .options(joinedload(Venta.detalles).joinedload(DetalleVenta.producto))
        .filter(Venta.cierre_id == cierre_id)
        .order_by(Venta.fecha.desc())
        .all()
    )


# ===== CIERRES DE CAJA =====
def create_cierre(db: Session, usuario_id: int, datos: CierreCajaCreate) -> CierreCaja:
    cierre = CierreCaja(
        usuario_id=usuario_id,
        total_efectivo=datos.total_efectivo,
        total_tarjeta=datos.total_tarjeta,
        cantidad_ventas=datos.cantidad_ventas,
        observaciones=datos.observaciones,
    )
    db.add(cierre)
    db.commit()
    db.refresh(cierre)
    return cierre


def get_cierre(db: Session, cierre_id: int) -> Optional[CierreCaja]:
    return db.query(CierreCaja).filter(CierreCaja.id == cierre_id).first()


def get_cierres_by_usuario(db: Session, usuario_id: int) -> list[CierreCaja]:
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