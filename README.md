# Proxy Dispenser
The most advanced proxy dispenser bot for Discord.

## Setup Bot

1. Open the [Discord developer portal](https://discord.com/developers/applications)

2. Create a new application.

3. Go to the Bot tab.

4. Choose a username, profile picture and banner.

5. It is recommended to not make your bot public so others can add it to their servers. To do this first go to the Installation tab, set the installation link to none, then go to the Bot tab and uncheck Public Bot.

6. Rename `.env.example` to `.env`

7. Next click Reset Token and add it to the `TOKEN` field of your `.env` file.

8. Now find the server you want to use and copy the server ID. Add that ID to the `SERVER_ID` field of your `.env` file.

## Setup

Node.js v22.6.0 is required. You can install this using `nvm`.

```bash
nvm i 22.6.0
nvm alias default 22.6.0
```

This project uses `pnpm` as the package manager.

## Running

> [!TIP]
> Run `pnpm install` to install the required dependencies.

- Run `pnpm start` to start the bot.

- Run `pnpm run dev` to automatically refresh.

An invite link will be generated in the terminal.