FROM oven/bun:alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY patches ./patches

RUN bun install

COPY . /app

CMD ["bun", "run", "start"]