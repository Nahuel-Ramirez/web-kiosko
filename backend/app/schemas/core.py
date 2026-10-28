from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

METODOS_PAGO_VALIDOS = {"EFECTIVO", "TARJETA"}
ROLES_VALIDOS = {"ADMIN", "CAJERO"}


# ===== USUARIOS =====
class UsuarioBase(BaseModel):
    nombre: str
    username: str
    rol: str
    activo: bool = True
    dni: Optional[str] = None

    @field_validator("rol")
    @classmethod
    def validar_rol(cls, valor: str) -> str:
        valor = valor.strip().upper()
        if valor not in ROLES_VALIDOS:
            raise ValueError(f"rol invalido. Debe ser uno de {sorted(ROLES_VALIDOS)}")
        return valor


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    username: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None
    dni: Optional[str] = None

    @field_validator("rol")
    @classmethod
    def validar_rol(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return valor
        valor = valor.strip().upper()
        if valor not in ROLES_VALIDOS:
            raise ValueError(f"rol invalido. Debe ser uno de {sorted(ROLES_VALIDOS)}")
        return valor


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
    precio_costo: Decimal = Field(ge=0)
    precio_venta: Decimal = Field(ge=0)
    stock_actual: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=5, ge=0)


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    codigo_barras: Optional[str] = None
    nombre: Optional[str] = None
    precio_costo: Optional[Decimal] = Field(default=None, ge=0)
    precio_venta: Optional[Decimal] = Field(default=None, ge=0)
    stock_actual: Optional[int] = Field(default=None, ge=0)
    stock_minimo: Optional[int] = Field(default=None, ge=0)


class ProductoOut(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ===== VENTAS =====
class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(ge=0)
    subtotal: Decimal = Field(ge=0)


class DetalleVentaCreate(DetalleVentaBase):
    pass


class DetalleVentaOut(DetalleVentaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class VentaBase(BaseModel):
    cliente_id: int = 1  # 1 = Consumidor Final (seed)
    total: Decimal = Field(ge=0)
    metodo_pago: str
    monto_recibido: Optional[Decimal] = None
    vuelto: Optional[Decimal] = None

    @field_validator("metodo_pago")
    @classmethod
    def normalizar_metodo_pago(cls, valor: str) -> str:
        # Normaliza a mayusculas para que coincida con el CHECK de la base
        # (database/init.sql) y con las comparaciones de los reportes.
        valor = valor.strip().upper()
        if valor not in METODOS_PAGO_VALIDOS:
            raise ValueError(f"metodo_pago invalido. Debe ser uno de {sorted(METODOS_PAGO_VALIDOS)}")
        return valor


class VentaCreate(VentaBase):
    detalles: List[DetalleVentaCreate] = Field(min_length=1)


class VentaOut(VentaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    cierre_id: Optional[int] = None
    fecha: datetime
    detalles: List[DetalleVentaOut] = []


# ===== CIERRES DE CAJA =====
class CierreCajaBase(BaseModel):
    total_efectivo: Decimal = Field(default=0, ge=0)
    total_tarjeta: Decimal = Field(default=0, ge=0)
    cantidad_ventas: int = Field(default=0, ge=0)
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
    ventas: List[VentaOut]
    total_general: Decimal
    total_efectivo: Decimal
    total_tarjeta: Decimal
    cantidad_ventas: int


class TurnoActualOut(BaseModel):
    """Ventas abiertas (sin cierre) del usuario y sus totales."""
    model_config = ConfigDict(from_attributes=True)

    cantidad_ventas: int
    total_efectivo: Decimal
    total_tarjeta: Decimal
    total_general: Decimal
    ventas: List[VentaOut] = []


class VentasPorUsuario(BaseModel):
    """Ventas agrupadas por usuario para reportes de admin."""
    usuario_id: int
    usuario_nombre: str
    usuario_username: str
    total_ventas: Decimal
    cantidad_ventas: int
    total_efectivo: Decimal
    total_tarjeta: Decimal
    cierres: List[CierreCajaOut] = []


class ReporteVentasPeriodo(BaseModel):
    """Reporte de ventas en un período (para admin)."""
    fecha_desde: datetime
    fecha_hasta: datetime
    total_general: Decimal
    total_efectivo: Decimal
    total_tarjeta: Decimal
    cantidad_ventas: int
    por_usuario: List[VentasPorUsuario]


# ===== CLIENTES (busqueda para el POS) =====
class ClienteBusquedaOut(BaseModel):
    """Forma que consume el frontend (ClientSearchInput): nombre + dni o cuit."""
    id: int
    nombre: str
    dni: Optional[str] = None
    cuit: Optional[str] = None


# ===== REPORTES: PREDICCION DE DEMANDA / HU-09 =====
class VentaHoraItem(BaseModel):
    hora: int
    ventas: int
    total: Decimal
    items_top: List[str] = []


class VentasPorHoraOut(BaseModel):
    fecha_desde: datetime
    fecha_hasta: datetime
    total_ventas: int
    total_monto: Decimal
    por_hora: List[VentaHoraItem]


class HoraPicoItem(BaseModel):
    hora_inicio: int
    hora_fin: int
    ventas_esperadas: float
    motivo: str


class RecomendacionItem(BaseModel):
    tipo: str  # "cajero" | "stock"
    mensaje: str


class HorasPicoOut(BaseModel):
    horas_pico: List[HoraPicoItem]
    recomendaciones: List[RecomendacionItem]


class ProductoMasVendido(BaseModel):
    producto_id: int
    nombre: str
    codigo_barras: str
    cantidad_vendida: int
    total_vendido: Decimal
