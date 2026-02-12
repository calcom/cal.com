# =====================================================
# 1️⃣ BUILDER STAGE (full deps + build)
# =====================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl python3 make g++
RUN corepack enable

COPY package.json yarn.lock turbo.json ./
COPY .yarn .yarn
COPY .yarnrc.yml ./

RUN yarn plugin import workspace-tools

# Runtime workspaces
COPY apps/worker apps/worker
COPY packages/queue packages/queue
COPY packages/calendar-sync packages/calendar-sync
COPY packages/prisma packages/prisma
COPY packages/tsconfig packages/tsconfig

# Build-only transitive workspaces
COPY packages/lib packages/lib
COPY packages/config packages/config
COPY packages/eslint-plugin packages/eslint-plugin
COPY packages/dayjs packages/dayjs
COPY packages/types packages/types

# Install FULL graph (for build)
RUN yarn workspaces focus \
    @calid/worker \
    @calid/queue \
    @calid/calendar-sync \
    @calid/prisma \
    --all && \
    yarn cache clean --all && \
    rm -rf .yarn/cache .yarn/install-state.gz

# Build everything (THIS generates Prisma client + engines)
RUN yarn turbo run build --filter=@calid/worker...

# -----------------------------------------------------
# STASH PRISMA RUNTIME BEFORE PRUNING NODE_MODULES
# -----------------------------------------------------
RUN mkdir -p /app/prisma-runtime && \
    cp -R node_modules/.prisma /app/prisma-runtime/.prisma && \
    cp -R node_modules/@prisma /app/prisma-runtime/@prisma

# =====================================================
# 2️⃣ PRUNE STEP — runtime deps ONLY (no prisma workspace)
# =====================================================
RUN rm -rf node_modules
ENV YARN_ENABLE_IMMUTABLE_INSTALLS=false

RUN yarn workspaces focus \
    @calid/worker \
    @calid/queue \
    @calid/calendar-sync \
    --production && \
    yarn cache clean --all && \
    rm -rf .yarn/cache .yarn/install-state.gz


# =====================================================
# 3️⃣ RUNTIME IMAGE
# =====================================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Yarn runtime essentials
COPY --from=builder --chown=worker:nodejs /app/.yarn/releases ./.yarn/releases
COPY --from=builder --chown=worker:nodejs /app/.yarn/plugins ./.yarn/plugins
COPY --from=builder --chown=worker:nodejs /app/.yarnrc.yml ./
COPY --from=builder --chown=worker:nodejs /app/package.json ./

# Compiled code
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=worker:nodejs /app/packages/queue/dist ./packages/queue/dist
COPY --from=builder --chown=worker:nodejs /app/packages/calendar-sync/dist ./packages/calendar-sync/dist

# package.json for module resolution
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder --chown=worker:nodejs /app/packages/queue/package.json ./packages/queue/package.json
COPY --from=builder --chown=worker:nodejs /app/packages/calendar-sync/package.json ./packages/calendar-sync/package.json

# Runtime node_modules 
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules

#
# Restore Prisma runtime (engines + generated client)
COPY --from=builder --chown=worker:nodejs /app/prisma-runtime/.prisma ./node_modules/.prisma
COPY --from=builder --chown=worker:nodejs /app/prisma-runtime/@prisma ./node_modules/@prisma


ENV NODE_ENV=production
USER worker

CMD ["node", "apps/worker/dist/index.js"]
