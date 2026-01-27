FROM node:lts-alpine

WORKDIR /app

RUN npm install --global corepack@latest

RUN apk add build-base curl wget

COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml

RUN corepack install
RUN pnpm install

COPY . /app

CMD ["pnpm", "run", "start"]