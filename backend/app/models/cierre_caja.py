from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class CierreCaja(Base):
    __tablename__ = 'cierres_caja'

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    fecha_cierre = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    total_efectivo = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_tarjeta = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_transferencia = Column(Numeric(12, 2), nullable=False, default=0.00)
    cantidad_ventas = Column(Integer, nullable=False, default=0)
    observaciones = Column(Text, nullable=True)

    # Arqueo de caja (obligatorio al cerrar)
    monto_inicial = Column(Numeric(12, 2), nullable=False, default=0.00)
    # Nullable como en init.sql: los cierres anteriores al arqueo no tienen conteo.
    # La obligatoriedad al cerrar la valida CierreCajaCreate / create_cierre.
    efectivo_contado = Column(Numeric(12, 2), nullable=True)
    # Pagos de deuda de fiado cobrados en efectivo durante el turno: también entran en la caja.
    total_cobros_fiado = Column(Numeric(12, 2), nullable=False, default=0.00)
    # diferencia se calcula en la BD como GENERATED STORED:
    # efectivo_contado - monto_inicial - total_efectivo - total_cobros_fiado
    # No incluir en el modelo ORM para evitar conflictos con INSERT (es generated column en PG)
    # Se accede via SQL raw o property en schema si se necesita

    usuario = relationship('Usuario', back_populates='cierres')
    ventas = relationship('Venta', back_populates='cierre')
