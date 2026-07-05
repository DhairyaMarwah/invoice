# syntax=docker/dockerfile:1
# Ledger — Next.js 15 + node:sqlite. Debian slim so the built-in SQLite and any
# native deps behave; Node 24 ships node:sqlite without a flag.

# ---- deps ----------------------------------------------------------------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ---------------------------------------------------------------
FROM node:24-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- run -----------------------------------------------------------------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

# Non-root user; /data is the persistent volume (SQLite file + uploads).
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs \
 && mkdir -p /data && chown -R nextjs:nodejs /data

# Next.js standalone output ships its own minimal server + traced node_modules.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "server.js"]
