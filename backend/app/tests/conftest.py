"""Fixtures de pytest: base SQLite en memoria, aislada por test, + cliente HTTP."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.session import Base, get_db
from app.main import app
from app.models.cliente import Cliente
from app.models.usuario import Usuario


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = Session()
    db.add(Cliente(dni_cuit="0", razon_social="Consumidor Final"))
    db.add(Usuario(nombre="Admin", username="admin", password_hash=hash_password("admin123"), rol="ADMIN", activo=True))
    db.add(Usuario(nombre="Cajero", username="cajero", password_hash=hash_password("cajero123"), rol="CAJERO", activo=True))
    db.commit()
    yield db
    db.close()
    engine.dispose()


@pytest.fixture()
def client(db_session):
    def _override():
        yield db_session

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _login(client, username, password):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


@pytest.fixture()
def admin_h(client):
    return _login(client, "admin", "admin123")


@pytest.fixture()
def cajero_h(client):
    return _login(client, "cajero", "cajero123")


@pytest.fixture()
def producto(client, admin_h):
    r = client.post(
        "/api/productos",
        headers=admin_h,
        json={"codigo_barras": "7790001", "nombre": "Gaseosa 500ml", "precio_costo": 100,
              "precio_venta": 180, "stock_actual": 10, "stock_minimo": 3},
    )
    assert r.status_code == 201, r.text
    return r.json()
