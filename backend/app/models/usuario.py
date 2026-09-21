from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class Usuario(Base):
    """Mapea la tabla 'usuarios' (ver database/init.sql)."""

    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    cierres = relationship("CierreCaja", back_populates="usuario")
    ventas = relationship("Venta", back_populates="usuario")
