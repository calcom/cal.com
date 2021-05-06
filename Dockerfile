FROM node:14
WORKDIR /usr/src/app
COPY package.json .
COPY prisma prisma
RUN yarn install
COPY . .
RUN yarn build
CMD [ "/usr/src/app/start.sh" ]
