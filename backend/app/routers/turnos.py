from datetime import date, datetime, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import (
    CierreCajaCreate,
    CierreCajaOut,
    ResumenTurno,
    TurnoActualOut,
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
    get_turno_actual,
    get_ultimo_cierre_abierto,
    get_ventas_by_usuario,
)

router = APIRouter(prefix="/api/turnos", tags=["turnos"])


def _inicio_del_dia(fecha: Optional[date]) -> Optional[datetime]:
    return datetime.combine(fecha, time.min) if fecha else None


def _fin_del_dia(fecha: Optional[date]) -> Optional[datetime]:
    return datetime.combine(fecha, time.max) if fecha else None


# ===== VENTAS (para cajeros) =====
@router.post("/ventas", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(
    datos: VentaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Registra una venta (cajero/admin). Asocia automáticamente al usuario logueado."""
    return create_venta(db, usuario.id, datos)


@router.get("/mis-ventas", response_model=List[VentaOut])
def mis_ventas(
    fecha_desde: Optional[date] = Query(None, description="YYYY-MM-DD, incluye todo el dia"),
    fecha_hasta: Optional[date] = Query(None, description="YYYY-MM-DD, incluye todo el dia"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Lista las ventas del usuario logueado."""
    return get_ventas_by_usuario(db, usuario.id, _inicio_del_dia(fecha_desde), _fin_del_dia(fecha_hasta))


@router.get("/turno-actual", response_model=TurnoActualOut)
def turno_actual(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Ventas aun sin cerrar del usuario y sus totales (calculado en el servidor)."""
    return get_turno_actual(db, usuario.id)


# ===== CIERRES DE CAJA (turnos) =====
@router.post("/cierre", response_model=CierreCajaOut, status_code=status.HTTP_201_CREATED)
def cerrar_turno(
    datos: CierreCajaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Cierra el turno actual del usuario (cajero/admin)."""
    return create_cierre(db, usuario.id, datos)


@router.get("/mis-cierres", response_model=List[CierreCajaOut])
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
    fecha_desde: date = Query(..., description="YYYY-MM-DD, incluye todo el dia"),
    fecha_hasta: date = Query(..., description="YYYY-MM-DD, incluye todo el dia"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Reporte de ventas en un período (solo ADMIN). Incluye totales por usuario y por método de pago."""
    if fecha_desde > fecha_hasta:
        raise HTTPException(status_code=400, detail="fecha_desde no puede ser posterior a fecha_hasta")
    return get_reporte_ventas_periodo(db, _inicio_del_dia(fecha_desde), _fin_del_dia(fecha_hasta))


@router.get("/reporte/usuario/{usuario_id}", response_model=VentasPorUsuario)
def reporte_por_usuario(
    usuario_id: int,
    fecha_desde: Optional[date] = Query(None, description="YYYY-MM-DD, incluye todo el dia"),
    fecha_hasta: Optional[date] = Query(None, description="YYYY-MM-DD, incluye todo el dia"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Reporte de ventas de un usuario específico en un período (solo ADMIN)."""
    fecha_desde_dt = _inicio_del_dia(fecha_desde)
    fecha_hasta_dt = _fin_del_dia(fecha_hasta)
    ventas = get_ventas_by_usuario(db, usuario_id, fecha_desde_dt, fecha_hasta_dt)

    total_ventas = sum(v.total for v in ventas)
    total_efectivo = sum(v.total for v in ventas if v.metodo_pago == "EFECTIVO")
    total_tarjeta = sum(v.total for v in ventas if v.metodo_pago == "TARJETA")
    total_transferencia = sum(v.total for v in ventas if v.metodo_pago == "TRANSFERENCIA")

    cierres = get_cierres_by_usuario(db, usuario_id)
    if fecha_desde_dt:
        cierres = [c for c in cierres if c.fecha_cierre >= fecha_desde_dt]
    if fecha_hasta_dt:
        cierres = [c for c in cierres if c.fecha_cierre <= fecha_hasta_dt]

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
        total_transferencia=total_transferencia,
        cierres=[CierreCajaOut.model_validate(c) for c in cierres],
    )