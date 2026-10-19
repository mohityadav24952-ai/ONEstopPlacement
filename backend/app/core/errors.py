import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")

_STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "VALIDATION_FAILED",
    429: "RATE_LIMITED",
}


class AppError(Exception):
    """An error we raise on purpose, with a stable code the frontend can rely on."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: dict | list | None = None,
) -> JSONResponse:
    request_id = _request_id(request)
    headers = {"X-Request-ID": request_id} if request_id else {}
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "request_id": request_id,
            }
        },
        headers=headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return _response(request, exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = _STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return _response(request, exc.status_code, code, message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Only field names and messages. Never echo the submitted values back.
        fields = [
            {"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]}
            for e in exc.errors()
        ]
        return _response(
            request, 422, "VALIDATION_FAILED", "Some fields are invalid.", {"fields": fields}
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled error request_id=%s path=%s", _request_id(request), request.url.path
        )
        return _response(
            request, 500, "INTERNAL_ERROR", "Something went wrong on our side."
        )