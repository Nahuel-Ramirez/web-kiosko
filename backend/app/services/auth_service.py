from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models.usuario import Usuario


def authenticate_user(db: Session, username: str, password: str) -> Usuario | None:
    """Valida usuario/contraseña. Devuelve el Usuario si es válido, o None."""
    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if not usuario or not usuario.activo:
        return None
    if not verify_password(password, usuario.password_hash):
        return None
    return usuario


def generar_token_para_usuario(usuario: Usuario) -> str:
    return create_access_token(data={"sub": usuario.username, "rol": usuario.rol})
