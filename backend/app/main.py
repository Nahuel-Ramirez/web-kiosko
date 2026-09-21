from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, turnos, usuarios, productos

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


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
