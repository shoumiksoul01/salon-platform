from fastapi import FastAPI

app = FastAPI(title="Salon Platform API")


@app.get("/health")
def health():
    return {"status": "ok"}