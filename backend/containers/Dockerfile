FROM node:24-alpine3.21

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm@latest

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN ["pnpm", "install", "--prod"]
# If you are building your code for production
# RUN npm ci --only=production
# Bundle app source
COPY . .

ARG APP_VERSION=hotbuild

RUN echo -n "Date: `date`" > ./version-build-time.txt
RUN echo -n "$APP_VERSION" > ./version.txt

# EXPOSE 8080
CMD ["npm", "run", "start"]
