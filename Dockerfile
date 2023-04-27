# Taken from https://github.com/calcom/docker/blob/main/Dockerfile

FROM node:18 as builder

WORKDIR /calcom

ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG NEXTAUTH_SECRET=secret
ARG CALENDSO_ENCRYPTION_KEY=secret
ARG MAX_OLD_SPACE_SIZE=4096

ENV NEXT_PUBLIC_WEBAPP_URL=http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
  NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
  CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
  DATABASE_URL=$DATABASE_URL \
  NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
  CALENDSO_ENCRYPTION_KEY=${CALENDSO_ENCRYPTION_KEY} \
  NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}

COPY calcom/package.json calcom/yarn.lock calcom/.yarnrc.yml calcom/playwright.config.ts calcom/turbo.json calcom/git-init.sh calcom/git-setup.sh ./
COPY calcom/.yarn ./.yarn
COPY calcom/apps/web ./apps/web
COPY calcom/packages ./packages

RUN yarn config set httpTimeout 1200000 && \ 
  npx turbo prune --scope=@calcom/web --docker && \
  yarn install && \
  yarn db-deploy && \
  yarn --cwd packages/prisma seed-app-store

RUN yarn turbo run build --filter=@calcom/web

# RUN yarn plugin import workspace-tools && \
#     yarn workspaces focus --all --production
RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache

FROM node:18 as builder-two

WORKDIR /calcom
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000

ENV NODE_ENV production

COPY calcom/package.json calcom/.yarnrc.yml calcom/yarn.lock calcom/turbo.json ./
COPY calcom/.yarn ./.yarn
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY scripts scripts

# Save value used during this build stage. If NEXT_PUBLIC_WEBAPP_URL and BUILT_NEXT_PUBLIC_WEBAPP_URL differ at
# run-time, then start.sh will find/replace static values again.
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
  BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL

RUN scripts/replace-placeholder.sh http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER ${NEXT_PUBLIC_WEBAPP_URL}

FROM node:18 as runner


WORKDIR /calcom
COPY --from=builder-two /calcom ./
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
  BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL

ENV NODE_ENV production
EXPOSE 3000
CMD ["/calcom/scripts/start.sh"]