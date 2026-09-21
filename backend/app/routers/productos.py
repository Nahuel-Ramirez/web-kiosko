from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.core import (
    ProductoCreate,
    ProductoOut,
    ProductoUpdate,
)
from app.services.core_service import (
    create_producto,
    delete_producto,
    get_producto,
    get_producto_by_codigo,
    get_productos,
    update_producto,
)

router = APIRouter(prefix="/api/productos", tags=["productos"])


def solo_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden gestionar productos",
        )
    return usuario


def admin_o_cajero(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    """Permite a ADMIN y CAJERO ver productos (para POS)."""
    if usuario.rol not in ("ADMIN", "CAJERO"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permisos para acceder a productos",
        )
    return usuario


@router.get("", response_model=list[ProductoOut])
def listar_productos(
    skip: int = 0,
    limit: int = 100,
    solo_stock_bajo: bool = Query(False, description="Filtrar productos con stock <= stock_minimo"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(admin_o_cajero),
):
    """Lista productos. Con solo_stock_bajo=true muestra solo alertas de stock crítico."""
    productos = get_productos(db, skip=skip, limit=limit)
    if solo_stock_bajo:
        productos = [p for p in productos if p.stock_actual <= p.stock_minimo]
    return productos


@router.get("/{producto_id}", response_model=ProductoOut)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(admin_o_cajero),
):
    """Obtiene un producto por ID."""
    producto = get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.get("/codigo/{codigo_barras}", response_model=ProductoOut)
def obtener_por_codigo(
    codigo_barras: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(admin_o_cajero),
):
    """Busca producto por código de barras (para lector de código en POS)."""
    producto = get_producto_by_codigo(db, codigo_barras)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(
    datos: ProductoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Crea un nuevo producto (solo ADMIN)."""
    if get_producto_by_codigo(db, datos.codigo_barras):
        raise HTTPException(status_code=400, detail="El código de barras ya existe")
    return create_producto(db, datos)


@router.put("/{producto_id}", response_model=ProductoOut)
def actualizar_producto(
    producto_id: int,
    datos: ProductoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Actualiza un producto (solo ADMIN)."""
    if datos.codigo_barras and get_producto_by_codigo(db, datos.codigo_barras):
        existing = get_producto_by_codigo(db, datos.codigo_barras)
        if existing.id != producto_id:
            raise HTTPException(status_code=400, detail="El código de barras ya existe")

    producto = update_producto(db, producto_id, datos)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.post("/{producto_id}/stock", response_model=ProductoOut)
def agregar_stock(
    producto_id: int,
    cantidad: int = Query(..., ge=1, description="Cantidad a AGREGAR al stock actual"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Agrega stock a un producto existente (solo ADMIN). Suma la cantidad al stock actual."""
    producto = get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.stock_actual += cantidad
    db.commit()
    db.refresh(producto)
    return producto


@router.put("/{producto_id}/stock", response_model=ProductoOut)
def setear_stock(
    producto_id: int,
    stock_nuevo: int = Query(..., ge=0, description="Nuevo valor absoluto de stock"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Establece el stock a un valor exacto (solo ADMIN)."""
    producto = get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.stock_actual = stock_nuevo
    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    """Elimina un producto (solo ADMIN)."""
    if not delete_producto(db, producto_id):
        raise HTTPException(status_code=404, detail="Producto no encontrado")