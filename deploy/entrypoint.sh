#!/bin/bash
# =============================================================================
# Entrypoint Script
# Initialize the container before starting supervisord
# =============================================================================

set -e

echo "=========================================="
echo "PDF Tools - Container Starting"
echo "=========================================="

# Create necessary directories
mkdir -p /var/log/supervisor
mkdir -p /var/log/nginx
mkdir -p /run/nginx
mkdir -p /tmp/gotenberg

# Fix permissions
chown -R appuser:appuser /home/appuser 2>/dev/null || true
chown -R appuser:appuser /tmp/gotenberg 2>/dev/null || true
chown -R www-data:www-data /var/log/nginx 2>/dev/null || true

# Setup cron jobs if crontab file exists
if [ -f /app/deploy/crontab ]; then
    echo "Loading cron jobs..."
    crontab /app/deploy/crontab
fi

# Wait for any initialization scripts
if [ -d /docker-entrypoint.d/ ]; then
    for f in /docker-entrypoint.d/*.sh; do
        [ -x "$f" ] && echo "Running $f" && "$f"
    done
fi

# Print environment info
echo "Node.js version: $(node --version)"
echo "Gotenberg version: $(/usr/local/bin/gotenberg --version 2>/dev/null || echo 'installed')"
echo "LibreOffice version: $(libreoffice --version 2>/dev/null | head -1 || echo 'installed')"
echo "=========================================="
echo "Starting services via supervisord..."
echo "=========================================="

# Execute the main command
exec "$@"
