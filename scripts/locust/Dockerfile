# =============================================================================
# Locust Load Testing Container for Books API
# =============================================================================
#
# This Dockerfile creates a containerized Locust load testing environment
# specifically configured for testing the Books API.
#
# USAGE:
# ------
# Build the image:
#   docker build -t books-api-locust:latest ./scripts/locust
#
# Run Web UI mode (recommended for interactive testing):
#   docker run -p 8089:8089 books-api-locust:latest \
#     --host=https://books-api.staging.cloudnative.lat
#
# Run headless mode (for CI/CD pipelines):
#   docker run books-api-locust:latest \
#     --host=https://books-api.staging.cloudnative.lat \
#     --headless -u 100 -r 10 -t 5m
#
# Run with specific tags:
#   docker run -p 8089:8089 books-api-locust:latest \
#     --host=https://books-api.staging.cloudnative.lat \
#     --tags smoke
#
# KUBERNETES DEPLOYMENT:
# ----------------------
# See the accompanying kubernetes manifests in this directory for
# deploying Locust as a distributed load testing cluster in Kubernetes.
#
# =============================================================================

FROM python:3.12-slim

# Labels for container metadata
LABEL maintainer="parraletz"
LABEL description="Locust load testing container for Books API"
LABEL version="1.0.0"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Locust default settings (can be overridden at runtime)
    LOCUST_HOST=http://localhost:3000 \
    LOCUST_USERS=10 \
    LOCUST_SPAWN_RATE=1 \
    LOCUST_RUN_TIME=60s \
    # Web UI settings
    LOCUST_WEB_PORT=8089 \
    LOCUST_WEB_HOST=0.0.0.0

# Create non-root user for security
RUN groupadd --gid 1000 locust && \
    useradd --uid 1000 --gid locust --shell /bin/bash --create-home locust

# Set working directory
WORKDIR /locust

# Install Locust and dependencies
# Pin versions for reproducibility
RUN pip install --no-cache-dir \
    locust==2.32.4 \
    gevent==24.11.1 \
    greenlet==3.1.1

# Copy locust configuration files
COPY --chown=locust:locust locustfile.py /locust/
COPY --chown=locust:locust requirements.txt /locust/

# Install additional requirements if present
RUN if [ -s requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Switch to non-root user
USER locust

# Expose the web UI port
EXPOSE 8089

# Health check for the web UI
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8089/ || exit 1

# Default entrypoint - runs Locust with web UI
# Override CMD to customize behavior
ENTRYPOINT ["locust", "-f", "/locust/locustfile.py"]

# Default command - starts web UI
# Override with --headless for CI/CD pipelines
CMD ["--web-host", "0.0.0.0", "--web-port", "8089"]
