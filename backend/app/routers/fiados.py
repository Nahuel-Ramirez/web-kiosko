from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import DeudorOut
from app.services.core_service import get_deudores

router = APIRouter(prefix="/api/fiados", tags=["fiados"])


def solo_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver los deudores",
        )
    return usuario


@router.get("/deudores", response_model=List[DeudorOut])
def deudores(db: Session = Depends(get_db), _: Usuario = Depends(solo_admin)):
    """Clientes con deuda de fiado, de mayor a menor (solo ADMIN)."""
    return get_deudores(db)
