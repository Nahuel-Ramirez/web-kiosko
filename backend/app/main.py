from fastapi import FastAPI

from app.routers import auth

app = FastAPI(title="Web Kiosko API")

app.include_router(auth.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
