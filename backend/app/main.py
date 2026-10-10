import logging
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging

configure_logging()
logger = logging.getLogger("portfolio")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment == "production":
        if len(settings.ip_hash_secret) < 32 or settings.ip_hash_secret.startswith("replace-with") or settings.ip_hash_secret == "local-development-only-change-before-deployment":
            raise RuntimeError("Set a private IP_HASH_SECRET of at least 32 characters in production")
        if not settings.database_url.startswith("postgresql+psycopg://"):
            raise RuntimeError("Production requires a PostgreSQL DATABASE_URL")
        if "https://port-folio-delta-wine.vercel.app" not in settings.origins:
            raise RuntimeError("Production CORS_ORIGINS must include the existing portfolio origin")
    if settings.environment == "development":
        from app.services.ai_service import development_warning
        warning = development_warning()
        if warning: logger.warning(warning)
        if not settings.email_provider or (settings.email_provider == "smtp" and not settings.smtp_host):
            logger.info("Email notification disabled in development.")
    yield


app = FastAPI(title="Ashish Portfolio API", version="1.0.0", lifespan=lifespan,
              docs_url="/api/docs" if settings.environment != "production" else None,
              redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=False,
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


@app.middleware("http")
async def security_and_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())
    started = time.perf_counter()
    # A proxy also enforces the limit; this check protects direct requests with known length.
    try:
        length = int(request.headers.get("content-length", "0"))
    except ValueError:
        return JSONResponse({"detail": "Invalid content length"}, status_code=400)
    if length > 32768:
        return JSONResponse({"detail": "Request body too large"}, status_code=413)
    if request.method == "POST":
        chunks = []
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 32768:
                return JSONResponse({"detail": "Request body too large"}, status_code=413)
            chunks.append(chunk)
        request._body = b"".join(chunks)
    response = await call_next(request)
    response.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
                             "Referrer-Policy": "strict-origin-when-cross-origin",
                             "X-Request-ID": request_id, "Cache-Control": "no-store"})
    logger.info("request", extra={"event": {"request_id": request_id, "method": request.method, "path": request.url.path,
                       "status": response.status_code, "duration_ms": round((time.perf_counter()-started)*1000, 1)}})
    return response


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exception: SQLAlchemyError):
    # Avoid logging SQL parameters because contact fields contain private information.
    logger.error("Database operation failed: %s", type(exception).__name__)
    return JSONResponse({"detail": "The service is temporarily unavailable. Please try again or email me directly."}, status_code=503)


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exception: Exception):
    logger.error("Unhandled request error: %s", type(exception).__name__)
    return JSONResponse({"detail": "An unexpected error occurred. Please try again."}, status_code=500)


app.include_router(router)
if settings.serve_frontend:
    app.mount("/", StaticFiles(directory=settings.frontend_dist, html=True), name="portfolio")
