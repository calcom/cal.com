# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app

# Required for some native deps
RUN apk add --no-cache libc6-compat

# ---------- Dependencies ----------
FROM base AS deps

RUN corepack enable

COPY package.json yarn.lock turbo.json ./
COPY .yarn .yarn
COPY .yarnrc.yml ./

# Now this works
RUN yarn plugin import workspace-tools

COPY packages/tsconfig packages/tsconfig
COPY packages/queue packages/queue
COPY apps/worker apps/worker

RUN yarn workspaces focus \
  @calid/worker \
  @calid/queue \
  @calcom/types \
  --all
# ---------- Build ----------
FROM deps AS build

# Build in correct order handled by turborepo, but we need to specify the filter to avoid building the entire monorepo
RUN yarn turbo run build --filter=@calid/worker...

# ---------- Runtime ----------
FROM base AS runner

ENV NODE_ENV=production

# Enable Corepack here too (node runtime still uses yarn pnp resolution)
RUN corepack enable
RUN corepack prepare yarn@3.4.1 --activate

# Copy runtime artifacts
COPY --from=build /app/apps/worker/dist apps/worker/dist
COPY --from=build /app/packages/queue/dist packages/queue/dist
COPY --from=build /app/node_modules node_modules
COPY apps/worker/package.json apps/worker/package.json
COPY packages/queue/package.json packages/queue/package.json

WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
