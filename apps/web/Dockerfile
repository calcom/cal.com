FROM calcom/cal.com AS base

WORKDIR /calcom

COPY ./.env.example ./.env.example
COPY ./.env.appStore.example ./.env.appStore.example

RUN cp ./.env.example ./.env
RUN cp ./.env.appStore.example ./.env.appStore

# Create NEXTAUTH_SECRET on .env
RUN echo NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\" >> ./.env

# Create CALENDSO_ENCRYPTION_KEY on .env
RUN echo CALENDSO_ENCRYPTION_KEY=\"$(openssl rand -base64 32)\" >> ./.env

# put NEXT_PUBLIC_DEBUG on .env
RUN echo NEXT_PUBLIC_DEBUG=1 >> ./.env

CMD ["yarn", "dev"]

FROM node:18 as runner

WORKDIR /calcom

COPY --from=base /calcom ./

CMD ["yarn", "dev"]
