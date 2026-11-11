from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import DeudorOut
from app.services.core_service import get_deudores

router = APIRouter(prefix="/api/fiados", tags=["fiados"])


@router.get("/deudores", response_model=List[DeudorOut])
def deudores(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Clientes con deuda de fiado, de mayor a menor (ADMIN y CAJERO: el cajero cobra las deudas)."""
    return get_deudores(db)
