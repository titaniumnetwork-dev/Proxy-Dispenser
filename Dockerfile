FROM oven/bun:alpine

WORKDIR /app

RUN apk add build-base curl wget

COPY package.json /app/package.json
COPY bun.lock /app/bun.lock

RUN bun install

COPY . /app

CMD ["bun", "run", "start"]