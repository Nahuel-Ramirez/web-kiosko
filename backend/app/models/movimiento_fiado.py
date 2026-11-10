from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class MovimientoFiado(Base):
    """Cuenta corriente del fiado: VENTA suma deuda, PAGO la baja (ver database/init.sql)."""

    __tablename__ = "movimientos_fiado"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    venta_id = Column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), unique=True, nullable=True)
    # Solo en los PAGO: cierre de caja del turno en que se cobró (NULL mientras el turno sigue abierto).
    cierre_id = Column(Integer, ForeignKey("cierres_caja.id"), nullable=True)
    tipo = Column(String(10), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    observaciones = Column(Text, nullable=True)

    cliente = relationship("Cliente", back_populates="movimientos_fiado")
    usuario = relationship("Usuario")
    venta = relationship("Venta")
