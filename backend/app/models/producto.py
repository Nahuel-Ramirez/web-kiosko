from sqlalchemy import Column, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    codigo_barras = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(150), nullable=False)
    precio_costo = Column(Numeric(12, 2), nullable=False)
    precio_venta = Column(Numeric(12, 2), nullable=False)
    stock_actual = Column(Integer, nullable=False, default=0)
    stock_minimo = Column(Integer, nullable=False, default=5)

    detalles_venta = relationship("DetalleVenta", back_populates="producto")