from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.core import ClienteBusquedaOut, ClienteCreate, ClienteOut, ClienteUpdate
from app.services.core_service import (
    buscar_clientes,
    create_cliente,
    delete_cliente,
    get_cliente,
    get_cliente_by_dni,
    get_clientes,
    update_cliente,
)

router = APIRouter(prefix="/api/clientes", tags=["clientes"])


def solo_admin(usuario: Usuario = Depends(get_current_user)) -> Usuario:
    if usuario.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden modificar o eliminar clientes",
        )
    return usuario


def _a_busqueda(cliente: Cliente) -> ClienteBusquedaOut:
    """Adapta Cliente a la forma que usa el POS: 11 digitos = CUIT, resto = DNI."""
    doc = cliente.dni_cuit or ""
    es_cuit = doc.isdigit() and len(doc) == 11
    return ClienteBusquedaOut(
        id=cliente.id,
        nombre=cliente.razon_social,
        dni=None if es_cuit else (doc or None),
        cuit=doc if es_cuit else None,
    )


@router.get("/buscar", response_model=List[ClienteBusquedaOut])
def buscar(
    dni: str = Query(..., min_length=1, description="DNI/CUIT (o parte) o nombre a buscar"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Autocompletado del POS (ADMIN y CAJERO)."""
    return [_a_busqueda(c) for c in buscar_clientes(db, dni)]


@router.get("", response_model=List[ClienteOut])
def listar(
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return get_clientes(db, skip=skip, limit=limit)


@router.get("/{cliente_id}", response_model=ClienteOut)
def obtener(cliente_id: int, db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    cliente = get_cliente(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def crear(datos: ClienteCreate, db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    """Alta de cliente desde el POS (ADMIN y CAJERO)."""
    if get_cliente_by_dni(db, datos.dni_cuit):
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese DNI/CUIT")
    return create_cliente(db, datos)


@router.put("/{cliente_id}", response_model=ClienteOut)
def actualizar(
    cliente_id: int,
    datos: ClienteUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(solo_admin),
):
    if cliente_id == 1:
        raise HTTPException(status_code=400, detail="Consumidor Final no se puede modificar")
    if datos.dni_cuit:
        existente: Optional[Cliente] = get_cliente_by_dni(db, datos.dni_cuit)
        if existente and existente.id != cliente_id:
            raise HTTPException(status_code=400, detail="Ya existe un cliente con ese DNI/CUIT")
    cliente = update_cliente(db, cliente_id, datos)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(cliente_id: int, db: Session = Depends(get_db), _: Usuario = Depends(solo_admin)):
    if cliente_id == 1:
        raise HTTPException(status_code=400, detail="Consumidor Final no se puede eliminar")
    if not delete_cliente(db, cliente_id):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
