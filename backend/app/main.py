from fastapi import FastAPI

app = FastAPI(title="Web Kiosko API")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
