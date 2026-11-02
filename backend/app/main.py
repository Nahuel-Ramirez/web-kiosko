from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Request
from fastapi.responses import JSONResponse

from app.routers import auth, clientes, productos, reportes, turnos, usuarios
from app.services.core_service import ReglaNegocioError

app = FastAPI(title="Web Kiosko API")

# Permite que el frontend (Vite, corriendo en otro puerto) llame a esta API
# desde el navegador. Agregar acá cualquier otro origen (ej: IP de red local
# para probar desde el celular) si hace falta.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(turnos.router)
app.include_router(productos.router)
app.include_router(clientes.router)
app.include_router(reportes.router)


@app.exception_handler(ReglaNegocioError)
def regla_negocio_handler(_: Request, exc: ReglaNegocioError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.mensaje})


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
