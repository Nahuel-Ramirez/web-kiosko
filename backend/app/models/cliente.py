from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    dni_cuit = Column(String(20), unique=True, nullable=False, index=True)
    razon_social = Column(String(150), nullable=False)
    domicilio = Column(String(200), nullable=True)
    telefono = Column(String(50), nullable=True)

    ventas = relationship("Venta", back_populates="cliente")