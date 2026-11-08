# One image for the whole HaaS app. Flask (backend/ + mongodb/) answers the API routes and also serves the
# built React frontend, so the page and the API share one address: no CORS setup and no VITE_API_URL needed.
# The database is not in the image. MONGO_URI and MONGO_DB are passed in when the container starts
# (Atlas in production, a throwaway MongoDB in docker-compose.yml).

# Stage 1: build the frontend. Node is only needed for this step, so it is left out of the final image.
FROM node:22-slim AS frontend
WORKDIR /app/haas-app
COPY haas-app/package.json haas-app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY haas-app/ ./
# With VITE_API_URL unset, a production build sends API requests to the page's own address (see createApi).
RUN npm run build

# Stage 2: the image that runs.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static \
    PORT=8000
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY mongodb/ mongodb/
COPY --from=frontend /app/haas-app/dist static/

# Run as an ordinary user, not root.
RUN useradd --create-home haas
USER haas

EXPOSE 8000
# gunicorn is a production web server; Flask's built-in one is for development only.
# PORT can be overridden, since many cloud hosts tell the container which port to listen on.
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT} --workers 2 backend.app:app"]
