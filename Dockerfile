FROM node:18 as builder

WORKDIR /
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_LICENSE_CONSENT
ARG CALCOM_TELEMETRY_DISABLED
ARG DATABASE_URL
ARG NEXTAUTH_SECRET=Xj3LXQ+zXmKmSruGdkQs9p+zBHUxnaPHlEKYltTzbaQ=
ARG CALENDSO_ENCRYPTION_KEY=k4wmHaRd91ruKgXdxiTaCjqGnevLneQ+
ARG MAX_OLD_SPACE_SIZE=4096

ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_LICENSE_CONSENT=$NEXT_PUBLIC_LICENSE_CONSENT \
    CALCOM_TELEMETRY_DISABLED=$CALCOM_TELEMETRY_DISABLED \
    DATABASE_URL=$DATABASE_URL \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    CALENDSO_ENCRYPTION_KEY=${CALENDSO_ENCRYPTION_KEY} \
    NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}

#COPY ./package.json ./yarn.lock ./turbo.json ./
#COPY calcom/apps/web ./apps/web
#COPY calcom/packages ./packages

RUN yarn global add turbo && \
    yarn config set network-timeout 1000000000 -g && \
    turbo prune --scope=@calcom/web --docker && \
    yarn install

RUN yarn turbo run build --filter=@calcom/web

FROM node:18 as runner

WORKDIR /calcom
ENV NODE_ENV production

RUN apt-get update && \
    apt-get -y install netcat && \
    rm -rf /var/lib/apt/lists/* && \
    npm install --global prisma

#COPY ./package.json ./yarn.lock ./turbo.json ./
#COPY --from=builder /calcom/node_modules ./node_modules
#COPY --from=builder /calcom/packages ./packages
#COPY --from=builder /calcom/apps/web ./apps/web
#COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma

EXPOSE 3000
CMD ["yarn", "start"]
