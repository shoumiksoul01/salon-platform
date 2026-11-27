from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """An error with a machine-readable code, as in docs/api-conventions.md:
    {"detail": "...", "code": "..."}. The frontend translates the code."""

    def __init__(self, status_code: int, code: str, detail: str, **extra: object) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.extra = extra


def add_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_request: Request, exc: ApiError) -> JSONResponse:
        body = {"detail": exc.detail, "code": exc.code, **exc.extra}
        return JSONResponse(status_code=exc.status_code, content=body)
