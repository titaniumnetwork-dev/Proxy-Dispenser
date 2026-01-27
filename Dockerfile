FROM node:lts-alpine

WORKDIR /app

RUN npm install --global corepack@latest

RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    curl wget build-essential

COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml

RUN corepack install
RUN pnpm install

COPY . /app

CMD ["bun", "run", "start"]