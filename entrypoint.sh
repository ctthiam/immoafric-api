#!/bin/sh
set -e

echo "[entrypoint] node $(node --version)"
echo "[entrypoint] checking dist/main.js..."
if [ ! -f /app/dist/main.js ]; then
  echo "[entrypoint] ERROR: /app/dist/main.js not found"
  ls /app/dist/ 2>&1 || echo "[entrypoint] dist/ directory is empty or missing"
  exit 1
fi
echo "[entrypoint] dist/main.js found"

echo "[entrypoint] running prisma db push..."
npx prisma db push --skip-generate 2>&1
echo "[entrypoint] prisma done, starting node..."

exec node dist/main 2>&1
