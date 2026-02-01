# syntax=docker/dockerfile:1.7

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
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG APP_BUILD_SHA=dev
ENV NEXT_PUBLIC_PDFEDITOR_BUILD_ID=$APP_BUILD_SHA

# Docker build 不需要 Playwright 浏览器，避免在依赖安装阶段下载，显著加速构建
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install dependencies
# 先复制必要文件，然后安装依赖
COPY package.json ./
COPY scripts ./scripts
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

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
FROM gotenberg AS runtime

USER root

ARG APP_BUILD_SHA=dev
ENV NEXT_PUBLIC_PDFEDITOR_BUILD_ID=$APP_BUILD_SHA

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    cron \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

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
COPY --from=builder --chown=appuser:appuser /app/scripts/validate-prod-env.mjs ./scripts/validate-prod-env.mjs

# Copy cron definitions for entrypoint bootstrap
COPY deploy/crontab /app/deploy/crontab

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
ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
