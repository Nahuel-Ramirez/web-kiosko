from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import (
    ResolverSolicitudPassword,
    SolicitudPasswordOut,
    UsuarioCreate,
    UsuarioOut,
    UsuarioUpdate,
)
from app.services.core_service import (
    atender_solicitud_password,
    create_usuario,
    delete_usuario,
    get_solicitudes_password_pendientes,
    get_usuario,
    get_usuario_by_dni,
    get_usuario_by_username,
    get_usuarios,
    update_usuario,
)

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


def solo_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a este recurso",
        )
    return usuario


@router.get("", response_model=List[UsuarioOut])
def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Lista todos los usuarios (solo ADMIN)."""
    return get_usuarios(db, skip=skip, limit=limit)


# Las rutas de pedidos de contraseña van antes de /{usuario_id} para que no se confundan.
@router.get("/solicitudes-password", response_model=List[SolicitudPasswordOut])
def listar_solicitudes_password(db: Session = Depends(get_db), _: Usuario = Depends(solo_admin)):
    """Pedidos de "¿Olvidó su contraseña?" pendientes, del más viejo al más nuevo (solo ADMIN)."""
    return get_solicitudes_password_pendientes(db)


@router.post("/solicitudes-password/{solicitud_id}/resolver", response_model=SolicitudPasswordOut)
def resolver_solicitud_password(
    solicitud_id: int,
    datos: ResolverSolicitudPassword,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(solo_admin),
):
    """Le pone la contraseña nueva al usuario y marca el pedido como RESUELTA (solo ADMIN)."""
    return atender_solicitud_password(db, solicitud_id, admin, datos.password_nueva)


@router.post("/solicitudes-password/{solicitud_id}/rechazar", response_model=SolicitudPasswordOut)
def rechazar_solicitud_password(
    solicitud_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(solo_admin),
):
    """Marca el pedido como RECHAZADA sin tocar la contraseña (solo ADMIN)."""
    return atender_solicitud_password(db, solicitud_id, admin)


@router.get("/{usuario_id}", response_model=UsuarioOut)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Obtiene un usuario por ID (solo ADMIN)."""
    usuario = get_usuario(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Crea un nuevo usuario (solo ADMIN)."""
    if get_usuario_by_username(db, datos.username):
        raise HTTPException(status_code=400, detail="El username ya existe")
    if datos.dni and get_usuario_by_dni(db, datos.dni):
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese DNI")
    return create_usuario(db, datos)


@router.put("/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario(
    usuario_id: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Actualiza un usuario (solo ADMIN)."""
    if datos.username and get_usuario_by_username(db, datos.username):
        existing = get_usuario_by_username(db, datos.username)
        if existing.id != usuario_id:
            raise HTTPException(status_code=400, detail="El username ya existe")
    if datos.dni:
        existing_dni = get_usuario_by_dni(db, datos.dni)
        if existing_dni and existing_dni.id != usuario_id:
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese DNI")

    usuario = update_usuario(db, usuario_id, datos)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(solo_admin),
):
    """Elimina un usuario (solo ADMIN). No permite auto-eliminarse."""
    if usuario_id == usuario_actual.id:
        raise HTTPException(status_code=400, detail="No podés eliminar tu propio usuario")
    if not delete_usuario(db, usuario_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")