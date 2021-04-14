## Dockerfile

FROM node:alpine
RUN mkdir -p /opt/app
WORKDIR /opt/app
RUN adduser -S app
COPY . .
RUN yarn install
RUN chown -R app /opt/app
USER app
EXPOSE 3000 5555
CMD ["yarn", "dev"]
