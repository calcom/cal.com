FROM node:16 as base

ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SLOTS_PROXY_URL
ARG GLOBAL_WEBHOOK_SUBSCRIBERS
ARG GOOGLE_API_CREDENTIALS
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG NEXTAUTH_SECRET=secret
ARG CALENDSO_ENCRYPTION_KEY=secret
ARG GOOGLE_LOGIN_ENABLED=true
ARG GLOBAL_WEBHOOK_SECRET
ARG SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN

ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    NEXT_PUBLIC_WEBSITE_URL=$NEXT_PUBLIC_WEBAPP_URL \
    NEXT_PUBLIC_SLOTS_PROXY_URL=$NEXT_PUBLIC_SLOTS_PROXY_URL \
    GLOBAL_WEBHOOK_SUBSCRIBERS=$GLOBAL_WEBHOOK_SUBSCRIBERS \
    GLOBAL_WEBHOOK_SECRET=$GLOBAL_WEBHOOK_SECRET \
    GOOGLE_API_CREDENTIALS=$GOOGLE_API_CREDENTIALS \
    SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
    DATABASE_URL=$DATABASE_URL \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    CALENDSO_ENCRYPTION_KEY=${CALENDSO_ENCRYPTION_KEY} \
    GOOGLE_LOGIN_ENABLED=$GOOGLE_LOGIN_ENABLED \
    SENTRY_IGNORE_API_RESOLUTION_ERROR=1 \
    NEXT_PUBLIC_APP_NAME="Tourlane" \
    NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS="hello@tourlane.com" \
    NEXT_PUBLIC_COMPANY_NAME="Tourlane GmbH"

FROM base as builder

ENV NODE_OPTIONS=--max-old-space-size=4096

WORKDIR /calcom
COPY package.json yarn.lock turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages
COPY git-init.sh git-setup.sh ./

RUN yarn config set network-timeout 1000000000 -g && \
    yarn install --frozen-lockfile

RUN yarn build

FROM base as runner

WORKDIR /calcom

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get -y install netcat sendmail && \
    rm -rf /var/lib/apt/lists/* && \
    npm install --global prisma

COPY package.json yarn.lock turbo.json ./
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY scripts scripts

EXPOSE 3000
CMD ["/calcom/scripts/start.sh"]
