# THIS FILE IS USED FOR DEVELOPMENT ONLY
# THIS IMAGE SHOULD NOT BE USED IN PRODUCTION
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# Add yarn globally
RUN npm install -g yarn

# Install dependencies
RUN yarn

# Add .env file
COPY .env.example /usr/src/app/.env

# Create NEXTAUTH_SECRET on .env
RUN echo NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\" >> /usr/src/app/.env

# Create CALENDSO_ENCRYPTION_KEY on .env
RUN echo CALENDSO_ENCRYPTION_KEY=\"$(openssl rand -base64 32)\" >> /usr/src/app/.env

# Bundle app source
COPY . .

# Run the app
CMD [ "yarn", "dev" ]
