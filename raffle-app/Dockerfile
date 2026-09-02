# ============================================================================
# Multi-stage Dockerfile
# ============================================================================

# ---- deps ------------------------------------------------------------------
FROM node:22-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


# ---- builder ---------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL is needed while Next.js runs `npm run build`
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npm run build


# ---- runner ----------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

RUN npm install --omit=dev pg bcryptjs \
  && npm cache clean --force

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]