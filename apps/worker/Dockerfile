# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app

# Required for some native deps
RUN apk add --no-cache libc6-compat openssl

# ---------- Dependencies ----------
FROM base AS deps

RUN corepack enable

COPY package.json yarn.lock turbo.json ./
COPY .yarn .yarn
COPY .yarnrc.yml ./

# Now this works
RUN yarn plugin import workspace-tools

COPY apps/worker apps/worker
COPY packages/tsconfig packages/tsconfig
COPY packages/queue packages/queue
COPY packages/calendar-sync packages/calendar-sync

#listed below are prisma and its transitive dependencies 
COPY packages/prisma packages/prisma

#below are the transitive dependencies of prisma which are not required
COPY packages/lib packages/lib
COPY packages/config packages/config
COPY packages/eslint-plugin packages/eslint-plugin
COPY packages/dayjs packages/dayjs
COPY packages/types packages/types

RUN yarn workspaces focus \
  @calid/worker \
  @calid/queue \
  @calid/calendar-sync \
  @calid/prisma \
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
# Copy compiled outputs of ALL runtime workspace deps
COPY --from=build /app/apps/worker/dist apps/worker/dist
COPY --from=build /app/packages/queue/dist packages/queue/dist
COPY --from=build /app/packages/calendar-sync/dist packages/calendar-sync/dist
COPY --from=build /app/packages/prisma packages/prisma


# Copy package.json of runtime workspaces (important for resolution)
COPY apps/worker/package.json apps/worker/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/calendar-sync/package.json packages/calendar-sync/package.json
COPY packages/prisma/package.json packages/prisma/package.json


# Copy node_modules AFTER workspaces exist
COPY --from=build /app/node_modules node_modules


WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
