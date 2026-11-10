from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    dni_cuit = Column(String(20), unique=True, nullable=False, index=True)
    razon_social = Column(String(150), nullable=False)
    domicilio = Column(String(200), nullable=True)
    telefono = Column(String(50), nullable=True)
    nombre = Column(String(80), nullable=True)
    apellido = Column(String(80), nullable=True)
    email = Column(String(120), nullable=True)
    limite_fiado = Column(Numeric(12, 2), nullable=False, default=10000.00)
    activo = Column(Boolean, nullable=False, default=True)
    fecha_alta = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ventas = relationship("Venta", back_populates="cliente")
    movimientos_fiado = relationship("MovimientoFiado", back_populates="cliente")
