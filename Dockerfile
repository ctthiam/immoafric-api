FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npm run build
# Compile seed.ts to plain JS so it can run without ts-node in production
RUN npx tsc prisma/seed.ts --module commonjs --target ES2021 --esModuleInterop --skipLibCheck --resolveJsonModule


FROM node:22-alpine AS runner
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh && npx prisma generate

EXPOSE 3001
CMD ["/app/entrypoint.sh"]
