FROM node:22-alpine

# better-sqlite3 has a native build step
RUN apk add --no-cache python3 make g++

# Enable Corepack so the pnpm version is pinned by package.json
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches

RUN pnpm install --frozen-lockfile

COPY . /app

CMD ["pnpm", "run", "start"]
