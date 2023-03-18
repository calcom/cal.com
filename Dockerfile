FROM ubuntu:kinetic as builder

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

COPY calcom/package.json calcom/yarn.lock calcom/turbo.json calcom/git-init.sh calcom/git-setup.sh calcom/.eslintrc.js calcom/.prettierrc.js calcom/.prettierignore calcom/.yarnrc.yml calcom/playwright.config.ts ./
COPY calcom/apps/web ./apps/web
COPY calcom/packages ./packages
COPY calcom/.yarn ./.yarn

RUN apt-get update && \
    apt-get install -y apt-utils && \
    apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get install -y wget && \
    npm i n -g && \
    n 18.15.0 && \
    npm i yarn -g && \
    corepack prepare yarn@3.4.1 --activate && \
    yarn set version 3.4.1 && \
    yarn add turbo && \
    yarn turbo prune --scope=@calcom/web --docker && \
    yarn install --network-timeout 1000000

RUN yarn turbo run build --filter=@calcom/web

FROM ubuntu:kinetic as runner

WORKDIR /calcom
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000

ENV NODE_ENV production

RUN apt-get update && \
    apt-get install -y apt-utils && \
    apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get install -y wget && \
    npm i n -g && \
    n 18.15.0 && \
    npm i yarn -g && \
    corepack prepare yarn@3.4.1 --activate && \
    yarn set version 3.4.1 && \
    apt-get -y install netcat-traditional && \
    rm -rf /var/lib/apt/lists/* && \
    npm install --global prisma

COPY --from=builder calcom/package.json calcom/yarn.lock calcom/turbo.json calcom/.yarnrc.yml ./
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /calcom/.yarn ./.yarn
COPY scripts scripts

# Save value used during this build stage. If NEXT_PUBLIC_WEBAPP_URL and BUILT_NEXT_PUBLIC_WEBAPP_URL differ at
# run-time, then start.sh will find/replace static values again.
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL

RUN scripts/replace-placeholder.sh http://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER ${NEXT_PUBLIC_WEBAPP_URL}

EXPOSE 3000
CMD ["/calcom/scripts/start.sh"]
