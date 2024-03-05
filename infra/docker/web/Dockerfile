FROM node:18 as builder
WORKDIR /calcom
ARG MAX_OLD_SPACE_SIZE=4096
ARG DISABLE_ESLINT_PLUGIN=true
ENV NEXT_PUBLIC_WEBAPP_URL=https://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER \
    NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE} \
    DISABLE_ESLINT_PLUGIN=${DISABLE_ESLINT_PLUGIN}
COPY ./package.json ./yarn.lock ./.yarnrc.yml ./playwright.config.ts ./turbo.json ./git-init.sh ./git-setup.sh ./
COPY ./.yarn ./.yarn
COPY ./apps/web ./apps/web
COPY ./packages ./packages
COPY .env .env
RUN rm -rf apps/web/test apps/web/playwright
RUN yarn config set httpTimeout 1200000 && \ 
    npx turbo prune --scope=@calcom/web --docker && \
    yarn install
RUN yarn turbo run build --filter=@calcom/web
RUN rm -rf node_modules/.cache .yarn/cache apps/web/.next/cache apps/web/test apps/web/abTest apps/web/playwright

FROM node:18 as builder-two
WORKDIR /calcom
ARG NEXT_PUBLIC_WEBAPP_URL=https://calendar.funnelhub.io
ENV NODE_ENV production
COPY ./package.json ./.yarnrc.yml ./yarn.lock ./turbo.json ./
COPY ./.yarn ./.yarn
COPY --from=builder /calcom/node_modules ./node_modules
COPY --from=builder /calcom/packages ./packages
COPY --from=builder /calcom/apps/web ./apps/web
COPY --from=builder /calcom/packages/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /calcom/.env .env
COPY scripts scripts
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL \
    BUILT_NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL
RUN chmod +777 /calcom/scripts/replace-placeholder.sh
RUN /calcom/scripts/replace-placeholder.sh https://NEXT_PUBLIC_WEBAPP_URL_PLACEHOLDER ${NEXT_PUBLIC_WEBAPP_URL}


FROM node:18 as runner
WORKDIR /calcom
COPY --from=builder-two /calcom ./
ARG NEXT_PUBLIC_WEBAPP_URL=https://calendar.funnelhub.io
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL
ENV NODE_ENV production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=30s --retries=5 \
    CMD wget --spider https://calendar.funnelhub.io || exit 1
RUN chmod +777 /calcom/scripts/start.sh
CMD ["/calcom/scripts/start.sh"]