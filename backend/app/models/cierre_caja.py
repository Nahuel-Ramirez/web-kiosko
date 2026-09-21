from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class CierreCaja(Base):
    __tablename__ = "cierres_caja"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_cierre = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    total_efectivo = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_tarjeta = Column(Numeric(12, 2), nullable=False, default=0.00)
    cantidad_ventas = Column(Integer, nullable=False, default=0)
    observaciones = Column(Text, nullable=True)

    usuario = relationship("Usuario", back_populates="cierres")
    ventas = relationship("Venta", back_populates="cierre")