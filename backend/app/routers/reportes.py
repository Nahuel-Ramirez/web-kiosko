from datetime import date, datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import HorasPicoOut, ProductoMasVendido, VentasPorHoraOut
from app.services import reportes_service

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


def solo_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a reportes",
        )
    return usuario


def _rango(desde: Optional[date], hasta: Optional[date]):
    d = datetime.combine(desde, time.min) if desde else None
    h = datetime.combine(hasta, time.max) if hasta else None
    if d and h and d > h:
        raise HTTPException(status_code=400, detail="fecha_desde no puede ser posterior a fecha_hasta")
    return d, h


@router.get("/ventas-por-hora", response_model=VentasPorHoraOut)
def ventas_por_hora(
    fecha_desde: date = Query(..., description="YYYY-MM-DD"),
    fecha_hasta: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    desde, hasta = _rango(fecha_desde, fecha_hasta)
    return reportes_service.ventas_por_hora(db, desde, hasta)


@router.get("/horas-pico", response_model=HorasPicoOut)
def horas_pico(
    fecha_desde: date = Query(..., description="YYYY-MM-DD"),
    fecha_hasta: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    desde, hasta = _rango(fecha_desde, fecha_hasta)
    return reportes_service.horas_pico(db, desde, hasta)


@router.get("/productos-mas-vendidos", response_model=List[ProductoMasVendido])
def productos_mas_vendidos(
    fecha_desde: Optional[date] = Query(None, description="YYYY-MM-DD"),
    fecha_hasta: Optional[date] = Query(None, description="YYYY-MM-DD"),
    limite: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """HU-09: ranking de productos mas vendidos en el periodo."""
    desde, hasta = _rango(fecha_desde, fecha_hasta)
    return reportes_service.productos_mas_vendidos(db, desde, hasta, limite)
