# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Codka Bulshada — production image for AWS ECS Fargate (linux/amd64 or arm64)
#
#   docker build -t codka-bulshada:latest .                 # web app (runner)
#   docker build --target tools -t codka-bulshada:tools .   # one-off ops tasks
#
# Debian slim (glibc) is used so the prebuilt @node-rs/argon2 binary works.
# No secrets are baked into the image; everything comes from the environment.
# -----------------------------------------------------------------------------
ARG NODE_VERSION=22.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --- Dependencies (cached separately from source) ------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# --- Build ---------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Ops tools image: db:indexes, db:seed, admin:create, jobs:cleanup-orphans ----
FROM base AS tools
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
USER node
CMD ["npm", "run", "db:indexes"]

# --- Runtime (default target) ----------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Next.js standalone output contains only the traced production dependencies.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# Port-aware so it works on ECS (PORT=3000) and hosts that inject their own PORT (e.g. Render).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
