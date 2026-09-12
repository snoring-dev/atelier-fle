# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache su-exec \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/data/media \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Resolve pnpm symlinks so the native .node binary is a real directory copy
COPY --from=builder /app/node_modules /tmp/nm
RUN set -eu; \
  copy_pkg() { \
    src="$(readlink -f "/tmp/nm/$1")"; \
    mkdir -p "/app/node_modules/$1"; \
    cp -a "$src"/. "/app/node_modules/$1/"; \
  }; \
  copy_pkg better-sqlite3; \
  copy_pkg drizzle-orm; \
  copy_pkg @node-rs/argon2; \
  # Platform bindings may be nested under pnpm's @node-rs/argon2 node_modules
  argon_nm="$(readlink -f /tmp/nm/@node-rs/argon2)/../"; \
  for pkg in argon2-linux-x64-musl argon2-linux-arm64-musl; do \
    if [ -d "$argon_nm/$pkg" ]; then \
      mkdir -p "/app/node_modules/@node-rs/$pkg"; \
      cp -a "$argon_nm/$pkg"/. "/app/node_modules/@node-rs/$pkg/"; \
    elif [ -e "/tmp/nm/@node-rs/$pkg" ] || [ -L "/tmp/nm/@node-rs/$pkg" ]; then \
      copy_pkg "@node-rs/$pkg"; \
    fi; \
  done; \
  chown -R nextjs:nodejs /app/node_modules; \
  rm -rf /tmp/nm

COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Entrypoint starts as root to chown the volume, then drops to nextjs
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
