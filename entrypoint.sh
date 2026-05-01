#!/bin/sh
set -e

echo "[entrypoint] node $(node --version)"

echo "[entrypoint] prisma db push..."
npx prisma db push --skip-generate 2>&1

echo "[entrypoint] seeding database (idempotent)..."
node prisma/seed.js 2>&1

echo "[entrypoint] starting api..."
exec node dist/main 2>&1
