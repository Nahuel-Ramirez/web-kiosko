from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ===== USUARIOS =====
class UsuarioBase(BaseModel):
    nombre: str
    username: str
    rol: str
    activo: bool = True
    dni: Optional[str] = None


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    username: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None
    dni: Optional[str] = None


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ===== CLIENTES =====
class ClienteBase(BaseModel):
    dni_cuit: str
    razon_social: str
    domicilio: Optional[str] = None
    telefono: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    dni_cuit: Optional[str] = None
    razon_social: Optional[str] = None
    domicilio: Optional[str] = None
    telefono: Optional[str] = None


class ClienteOut(ClienteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ===== PRODUCTOS =====
class ProductoBase(BaseModel):
    codigo_barras: str
    nombre: str
    precio_costo: Decimal
    precio_venta: Decimal
    stock_actual: int = 0
    stock_minimo: int = 5


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    codigo_barras: Optional[str] = None
    nombre: Optional[str] = None
    precio_costo: Optional[Decimal] = None
    precio_venta: Optional[Decimal] = None
    stock_actual: Optional[int] = None
    stock_minimo: Optional[int] = None


class ProductoOut(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ===== VENTAS =====
class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


class DetalleVentaCreate(DetalleVentaBase):
    pass


class DetalleVentaOut(DetalleVentaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class VentaBase(BaseModel):
    cliente_id: int
    total: Decimal
    metodo_pago: str
    monto_recibido: Optional[Decimal] = None
    vuelto: Optional[Decimal] = None


class VentaCreate(VentaBase):
    detalles: list[DetalleVentaCreate]


class VentaOut(VentaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    cierre_id: Optional[int] = None
    fecha: datetime
    detalles: list[DetalleVentaOut] = []


# ===== CIERRES DE CAJA =====
class CierreCajaBase(BaseModel):
    total_efectivo: Decimal = 0
    total_tarjeta: Decimal = 0
    cantidad_ventas: int = 0
    observaciones: Optional[str] = None


class CierreCajaCreate(CierreCajaBase):
    pass


class CierreCajaOut(CierreCajaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    fecha_cierre: datetime
    usuario_nombre: Optional[str] = None


# ===== REPORTES =====
class ResumenTurno(BaseModel):
    """Resumen de un turno/cierre de caja con detalle de ventas."""
    cierre: CierreCajaOut
    ventas: list[VentaOut]
    total_general: Decimal
    total_efectivo: Decimal
    total_tarjeta: Decimal
    cantidad_ventas: int


class VentasPorUsuario(BaseModel):
    """Ventas agrupadas por usuario para reportes de admin."""
    usuario_id: int
    usuario_nombre: str
    usuario_username: str
    total_ventas: Decimal
    cantidad_ventas: int
    total_efectivo: Decimal
    total_tarjeta: Decimal
    cierres: list[CierreCajaOut] = []


class ReporteVentasPeriodo(BaseModel):
    """Reporte de ventas en un período (para admin)."""
    fecha_desde: datetime
    fecha_hasta: datetime
    total_general: Decimal
    total_efectivo: Decimal
    total_tarjeta: Decimal
    cantidad_ventas: int
    por_usuario: list[VentasPorUsuario]