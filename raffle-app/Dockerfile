# ============================================================================
# Multi-stage Dockerfile — builds a minimal production image using Next.js
# "standalone" output (see next.config.mjs: output: "standalone").
# ============================================================================

# ---- deps: install once, cached as long as package*.json don't change ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js app -------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .


RUN npm run build

# ---- runner: copy only what's needed to run -------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone output already bundles a minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# node-postgres and bcryptjs are used by scripts/seed-admin.mjs, which runs
# outside the standalone server bundle — install just those two.
RUN npm install --omit=dev pg bcryptjs && npm cache clean --force

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
