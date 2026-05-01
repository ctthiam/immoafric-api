#!/bin/sh
set -e

npx prisma db push --skip-generate 2>&1
exec node dist/main 2>&1
