# ─── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

RUN npx prisma generate

COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

# prisma ve @prisma/client artık production dependency, npm ci yükleyecek
RUN npm ci --omit=dev

# Prisma generated client (builder'dan kopyala)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Migration çalıştır, ardından sunucuyu başlat
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
