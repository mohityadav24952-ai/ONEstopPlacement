FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY app ./app

# Run as a non-root user. Uploaded files go to STORAGE_DIR (mount a volume or use object storage).
RUN useradd --create-home appuser && mkdir -p /data/storage && chown -R appuser /data
USER appuser
ENV STORAGE_DIR=/data/storage ENVIRONMENT=production

EXPOSE 8000
# Migrations are run as a separate release step: `alembic upgrade head`.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
