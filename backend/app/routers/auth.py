from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, TokenResponse, UsuarioOut
from app.schemas.core import SolicitudPasswordCreate
from app.services.auth_service import authenticate_user, generar_token_para_usuario
from app.services.core_service import crear_solicitud_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

MENSAJE_SOLICITUD = (
    "Solicitud enviada. Si el usuario existe, un administrador la va a revisar "
    "y le va a informar la nueva contraseña."
)


@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    """HU-01: valida credenciales y devuelve un JWT con el rol del usuario."""
    usuario = authenticate_user(db, datos.username, datos.password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    token = generar_token_para_usuario(usuario)
    return TokenResponse(access_token=token, rol=usuario.rol, nombre=usuario.nombre)


@router.post("/logout")
def logout(usuario: Usuario = Depends(get_current_user)):
    """El JWT es stateless: el cliente descarta el token para 'cerrar sesión'.
    Este endpoint queda como punto explícito para el frontend y para el día
    de mañana si se agrega una blacklist de tokens."""
    return {"detail": f"Sesión cerrada para {usuario.username}"}


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    """Devuelve los datos del usuario logueado según su JWT.
    Útil para que el frontend sepa el rol sin decodificar el token él mismo."""
    return usuario


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def olvide_password(datos: SolicitudPasswordCreate, db: Session = Depends(get_db)):
    """Pedido de "¿Olvidó su contraseña?": queda para que un administrador le ponga una
    contraseña nueva (en Cajeros). Responde lo mismo exista o no el usuario, para no
    revelar qué usuarios hay."""
    crear_solicitud_password(db, datos.username, datos.justificacion)
    return {"detail": MENSAJE_SOLICITUD}
