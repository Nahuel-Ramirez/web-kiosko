"""Seed inicial de usuarios (Admin y Cajero) para poder loguearse desde el día 1.

Ejecutar una sola vez, con la base de datos ya creada (database/init.sql aplicado):

    cd backend
    python -m app.db.seed
"""

from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.usuario import Usuario

USUARIOS_INICIALES = [
    {"nombre": "Administrador", "username": "admin", "password": "admin123", "rol": "ADMIN"},
    {"nombre": "Cajero Demo", "username": "cajero", "password": "cajero123", "rol": "CAJERO"},
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for datos in USUARIOS_INICIALES:
            ya_existe = db.query(Usuario).filter(Usuario.username == datos["username"]).first()
            if ya_existe:
                continue
            db.add(
                Usuario(
                    nombre=datos["nombre"],
                    username=datos["username"],
                    password_hash=hash_password(datos["password"]),
                    rol=datos["rol"],
                    activo=True,
                )
            )
        db.commit()
        print("Seed de usuarios completado (admin/admin123, cajero/cajero123).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
