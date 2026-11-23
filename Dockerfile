# syntax=docker/dockerfile:1.7
# Multi-stage build for the Next.js standalone server.
#   builder → full toolchain (also used by the one-off "migrate" job: prisma migrate deploy + seed)
#   runner  → minimal non-root runtime

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall runs `prisma generate`; it needs no database.
RUN npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/storage/uploads
RUN apk add --no-cache wget \
 && addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs \
 && mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Optimized-image and data cache; mounted as a volume in production so it survives deploys.
RUN mkdir -p /app/.next/cache && chown nextjs:nodejs /app/.next/cache
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/store-settings > /dev/null || exit 1
CMD ["node", "server.js"]
