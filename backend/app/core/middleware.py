import logging
import time
import uuid

from fastapi import Request

logger = logging.getLogger("app.request")


async def request_context_middleware(request: Request, call_next):
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = request_id
    started = time.perf_counter()

    response = await call_next(request)

    duration_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "%s %s -> %s in %.0fms request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )
    return response