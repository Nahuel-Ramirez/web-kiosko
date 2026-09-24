from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.services.core_service import (
    create_usuario,
    delete_usuario,
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


@router.get("", response_model=list[UsuarioOut])
def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Lista todos los usuarios (solo ADMIN)."""
    return get_usuarios(db, skip=skip, limit=limit)


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
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    if not delete_usuario(db, usuario_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")