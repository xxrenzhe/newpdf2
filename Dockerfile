# =============================================================================
# PDF Tools - Single Container Deployment
#
# This Dockerfile creates a single container with:
# - Next.js application (PDF tools frontend + API)
# - Gotenberg (Office to PDF conversion via LibreOffice)
# - Nginx (reverse proxy, port 80)
# - Supervisord (process manager)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Next.js application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
# 先复制必要文件，然后安装依赖
COPY package.json ./
COPY scripts ./scripts
RUN npm install

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Get Gotenberg binary from official image
# -----------------------------------------------------------------------------
FROM gotenberg/gotenberg:8.17.3 AS gotenberg

# -----------------------------------------------------------------------------
# Stage 3: Production runtime
# -----------------------------------------------------------------------------
FROM ubuntu:22.04 AS runtime

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Node.js runtime
    curl \
    ca-certificates \
    # Nginx
    nginx \
    # Supervisord
    supervisor \
    # LibreOffice for document conversion
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    # Fonts for proper document rendering
    fonts-liberation \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    # PDF utilities
    ghostscript \
    pdftk-java \
    # Cleanup
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy Gotenberg binary from official image
COPY --from=gotenberg /usr/bin/gotenberg /usr/local/bin/gotenberg
RUN chmod +x /usr/local/bin/gotenberg

# Create application user
RUN useradd -m -s /bin/bash appuser

# Create necessary directories
RUN mkdir -p /app /var/log/supervisor /var/run/nginx /run/nginx \
    && chown -R appuser:appuser /app

# Copy Next.js build output
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app/.next/standalone ./
COPY --from=builder --chown=appuser:appuser /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appuser /app/public ./public

# Copy deployment configurations
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV GOTENBERG_URL=http://127.0.0.1:3001

# Expose only port 80 (Nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Start all services via supervisord
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
