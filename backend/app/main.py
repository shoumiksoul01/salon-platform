from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import close_pool
from .errors import add_error_handlers
from .routers import shop, shop_media

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    close_pool()


app = FastAPI(title="Salon Platform API", lifespan=lifespan)
add_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().frontend_origin.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# One router file per feature, one line each (docs/workflow.md).
app.include_router(shop.router, prefix=API_PREFIX)
app.include_router(shop_media.router, prefix=API_PREFIX)
