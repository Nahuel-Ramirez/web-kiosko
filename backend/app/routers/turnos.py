from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import (
    CierreCajaCreate,
    CierreCajaOut,
    ResumenTurno,
    ReporteVentasPeriodo,
    VentasPorUsuario,
    VentaCreate,
    VentaOut,
)
from app.services.core_service import (
    create_cierre,
    create_venta,
    get_cierre,
    get_cierres_by_usuario,
    get_reporte_ventas_periodo,
    get_resumen_turno,
    get_ultimo_cierre_abierto,
    get_ventas_by_usuario,
)

router = APIRouter(prefix="/api/turnos", tags=["turnos"])


# ===== VENTAS (para cajeros) =====
@router.post("/ventas", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(
    datos: VentaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Registra una venta (cajero/admin). Asocia automáticamente al usuario logueado."""
    return create_venta(db, usuario.id, datos)


@router.get("/mis-ventas", response_model=list[VentaOut])
def mis_ventas(
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Lista las ventas del usuario logueado (cajero ve solo las suyas, admin ve todas si quiere)."""
    return get_ventas_by_usuario(db, usuario.id, fecha_desde, fecha_hasta)


# ===== CIERRES DE CAJA (turnos) =====
@router.post("/cierre", response_model=CierreCajaOut, status_code=status.HTTP_201_CREATED)
def cerrar_turno(
    datos: CierreCajaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Cierra el turno actual del usuario (cajero/admin)."""
    return create_cierre(db, usuario.id, datos)


@router.get("/mis-cierres", response_model=list[CierreCajaOut])
def mis_cierres(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Lista los cierres de caja del usuario logueado."""
    return get_cierres_by_usuario(db, usuario.id)


@router.get("/cierre/{cierre_id}", response_model=ResumenTurno)
def ver_cierre(
    cierre_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Ver detalle completo de un cierre (turno) con sus ventas."""
    resumen = get_resumen_turno(db, cierre_id)
    if not resumen:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")

    # Cajero solo ve sus propios cierres
    if usuario.rol != "ADMIN" and resumen.cierre.usuario_id != usuario.id:
        raise HTTPException(status_code=403, detail="No puedes ver cierres de otros usuarios")

    return resumen


# ===== REPORTES (solo ADMIN) =====
def solo_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a reportes",
        )
    return usuario


@router.get("/reporte/periodo", response_model=ReporteVentasPeriodo)
def reporte_ventas_periodo(
    fecha_desde: datetime = Query(..., description="Fecha inicio (ISO 8601)"),
    fecha_hasta: datetime = Query(..., description="Fecha fin (ISO 8601)"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Reporte de ventas en un período (solo ADMIN). Incluye totales por usuario y por método de pago."""
    return get_reporte_ventas_periodo(db, fecha_desde, fecha_hasta)


@router.get("/reporte/usuario/{usuario_id}", response_model=VentasPorUsuario)
def reporte_por_usuario(
    usuario_id: int,
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Reporte de ventas de un usuario específico en un período (solo ADMIN)."""
    ventas = get_ventas_by_usuario(db, usuario_id, fecha_desde, fecha_hasta)

    total_ventas = sum(v.total for v in ventas)
    total_efectivo = sum(v.total for v in ventas if v.metodo_pago == "EFECTIVO")
    total_tarjeta = sum(v.total for v in ventas if v.metodo_pago == "TARJETA")

    cierres = get_cierres_by_usuario(db, usuario_id)
    if fecha_desde:
        cierres = [c for c in cierres if c.fecha_cierre >= fecha_desde]
    if fecha_hasta:
        cierres = [c for c in cierres if c.fecha_cierre <= fecha_hasta]

    usuario_obj = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario_obj:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return VentasPorUsuario(
        usuario_id=usuario_obj.id,
        usuario_nombre=usuario_obj.nombre,
        usuario_username=usuario_obj.username,
        total_ventas=total_ventas,
        cantidad_ventas=len(ventas),
        total_efectivo=total_efectivo,
        total_tarjeta=total_tarjeta,
        cierres=[CierreCajaOut.model_validate(c) for c in cierres],
    )