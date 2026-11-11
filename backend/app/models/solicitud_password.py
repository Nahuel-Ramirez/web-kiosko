from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class SolicitudPassword(Base):
    """Pedido de "¿Olvidó su contraseña?" que atiende un administrador (ver database/init.sql)."""

    __tablename__ = "solicitudes_password"
    # Como mucho un pedido PENDIENTE por usuario.
    __table_args__ = (
        Index(
            "uq_solicitudes_password_pendiente", "usuario_id", unique=True,
            postgresql_where=text("estado = 'PENDIENTE'"),
            sqlite_where=text("estado = 'PENDIENTE'"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    motivo = Column(Text, nullable=False)
    estado = Column(String(10), nullable=False, default="PENDIENTE", server_default="PENDIENTE")
    fecha_solicitud = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    atendida_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    fecha_atencion = Column(DateTime(timezone=True), nullable=True)

    usuario = relationship("Usuario", foreign_keys=[usuario_id])
