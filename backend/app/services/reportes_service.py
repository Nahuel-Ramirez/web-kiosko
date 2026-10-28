"""Reportes analiticos: ventas por hora, horas pico (prediccion simple) y
productos mas vendidos. Toda la agregacion se hace en Python/SQL estandar para
funcionar igual en PostgreSQL y en SQLite (dev/tests)."""

from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.producto import Producto
from app.models.venta import DetalleVenta, Venta
from app.schemas.core import (
    HoraPicoItem,
    HorasPicoOut,
    ProductoMasVendido,
    RecomendacionItem,
    VentaHoraItem,
    VentasPorHoraOut,
)

# Una hora es "pico" si su promedio diario supera el promedio de las horas con
# actividad por este factor (y al menos 1 venta/dia en promedio).
FACTOR_PICO = 1.25
TOP_PRODUCTOS_POR_HORA = 3


def _ventas_del_periodo(db: Session, desde: datetime, hasta: datetime) -> List[Venta]:
    return (
        db.query(Venta)
        .options(joinedload(Venta.detalles).joinedload(DetalleVenta.producto))
        .filter(Venta.fecha >= desde, Venta.fecha <= hasta)
        .all()
    )


def _dias_en_rango(desde: datetime, hasta: datetime) -> int:
    return max((hasta.date() - desde.date()).days + 1, 1)


def ventas_por_hora(db: Session, desde: datetime, hasta: datetime) -> VentasPorHoraOut:
    ventas = _ventas_del_periodo(db, desde, hasta)

    cantidad: Dict[int, int] = defaultdict(int)
    monto: Dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    unidades: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for v in ventas:
        h = v.fecha.hour
        cantidad[h] += 1
        monto[h] += v.total
        for d in v.detalles:
            nombre = d.producto.nombre if d.producto else "Producto %s" % d.producto_id
            unidades[h][nombre] += d.cantidad

    por_hora = []
    for h in sorted(cantidad):
        top = sorted(unidades[h].items(), key=lambda kv: (-kv[1], kv[0]))[:TOP_PRODUCTOS_POR_HORA]
        por_hora.append(
            VentaHoraItem(hora=h, ventas=cantidad[h], total=monto[h], items_top=[n for n, _ in top])
        )

    return VentasPorHoraOut(
        fecha_desde=desde,
        fecha_hasta=hasta,
        total_ventas=len(ventas),
        total_monto=sum((v.total for v in ventas), Decimal("0")),
        por_hora=por_hora,
    )


def _agrupar_consecutivas(horas: List[int]) -> List[List[int]]:
    grupos: List[List[int]] = []
    for h in sorted(horas):
        if grupos and h == grupos[-1][-1] + 1:
            grupos[-1].append(h)
        else:
            grupos.append([h])
    return grupos


def horas_pico(db: Session, desde: datetime, hasta: datetime) -> HorasPicoOut:
    ventas = _ventas_del_periodo(db, desde, hasta)
    if not ventas:
        return HorasPicoOut(horas_pico=[], recomendaciones=[])

    dias = _dias_en_rango(desde, hasta)
    cantidad: Dict[int, int] = defaultdict(int)
    unidades_por_hora: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for v in ventas:
        cantidad[v.fecha.hour] += 1
        for d in v.detalles:
            unidades_por_hora[v.fecha.hour][d.producto_id] += d.cantidad

    promedio_diario = {h: c / dias for h, c in cantidad.items()}
    media = sum(promedio_diario.values()) / len(promedio_diario)
    umbral = max(media * FACTOR_PICO, 1.0)
    horas_en_pico = [h for h, p in promedio_diario.items() if p >= umbral]

    picos: List[HoraPicoItem] = []
    recomendaciones: List[RecomendacionItem] = []
    consumo_pico: Dict[int, float] = defaultdict(float)  # producto_id -> unidades/dia en horas pico

    for grupo in _agrupar_consecutivas(horas_en_pico):
        esperadas = round(sum(promedio_diario[h] for h in grupo), 1)
        inicio, fin = grupo[0], grupo[-1] + 1
        picos.append(
            HoraPicoItem(
                hora_inicio=inicio,
                hora_fin=fin,
                ventas_esperadas=esperadas,
                motivo="Promedio de %s ventas/dia, %.0f%% sobre el promedio horario"
                % (esperadas, (esperadas / (media * len(grupo)) - 1) * 100),
            )
        )
        recomendaciones.append(
            RecomendacionItem(
                tipo="cajero",
                mensaje="Reforzar cajeros entre las %02d:00 y las %02d:00 (≈ %s ventas por dia esperadas)."
                % (inicio, fin, esperadas),
            )
        )
        for h in grupo:
            for producto_id, unidades in unidades_por_hora[h].items():
                consumo_pico[producto_id] += unidades / dias

    # Recomendaciones de stock: productos cuyo stock no cubre un dia de horas pico
    if consumo_pico:
        productos = db.query(Producto).filter(Producto.id.in_(list(consumo_pico.keys()))).all()
        for p in sorted(productos, key=lambda x: x.stock_actual - consumo_pico[x.id]):
            esperado = consumo_pico[p.id]
            if p.stock_actual < esperado or p.stock_actual <= p.stock_minimo:
                recomendaciones.append(
                    RecomendacionItem(
                        tipo="stock",
                        mensaje="Reponer '%s': stock %s vs. consumo esperado en horas pico ≈ %.1f u./dia."
                        % (p.nombre, p.stock_actual, esperado),
                    )
                )

    return HorasPicoOut(horas_pico=picos, recomendaciones=recomendaciones)


def productos_mas_vendidos(
    db: Session, desde: Optional[datetime], hasta: Optional[datetime], limite: int = 10
) -> List[ProductoMasVendido]:
    q = (
        db.query(
            Producto.id,
            Producto.nombre,
            Producto.codigo_barras,
            func.sum(DetalleVenta.cantidad).label("cantidad"),
            func.sum(DetalleVenta.subtotal).label("total"),
        )
        .join(DetalleVenta, DetalleVenta.producto_id == Producto.id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
    )
    if desde:
        q = q.filter(Venta.fecha >= desde)
    if hasta:
        q = q.filter(Venta.fecha <= hasta)
    filas = (
        q.group_by(Producto.id, Producto.nombre, Producto.codigo_barras)
        .order_by(func.sum(DetalleVenta.cantidad).desc(), Producto.nombre.asc())
        .limit(limite)
        .all()
    )
    return [
        ProductoMasVendido(
            producto_id=f.id,
            nombre=f.nombre,
            codigo_barras=f.codigo_barras,
            cantidad_vendida=int(f.cantidad),
            total_vendido=f.total,
        )
        for f in filas
    ]
