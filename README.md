# Proxy Dispenser

The most advanced proxy dispenser bot for Discord.

## Setup Bot

1. Open the [Discord developer portal](https://discord.com/developers/applications).

2. Create a new application.

3. Go to the Bot tab.

4. Choose a username, profile picture and banner.

5. It is recommended to not make your bot public so others can add it to their servers. To do this first go to the Installation tab, set the installation link to none, then go to the Bot tab and uncheck Public Bot.

6. Rename `.env.example` to `.env`

7. Next click Reset Token and add it to the `TOKEN` field of your `.env` file.

## Setup

Node.js v22.8.0 is required. You can install this using `nvm`.

```bash
nvm i 22.8.0
nvm alias default 22.8.0
```

This project uses `pnpm` as the package manager.

## Running

> [!TIP]
> Run `pnpm install` to install the required dependencies.

- Run `pnpm start` to start the bot.

- Run `pnpm run dev` to automatically refresh the bot when a file is changed.

An invite link will be generated in the console.

## Config

First rename `config.example.json` to `config.json`.

Set `serverID` to the ID of the server you are using.

Set `theme` to a hex color of your choice.

Set `limit` to the allowed proxies per month.

Set `reportsID` to the ID of a channel that will recieve reports. Leave blank to disable reports.

## Commands

`/docs` => Sends docs link

`/panel` => Sends proxy panel

### Context Menu

`User > Apps > Reset` => Reset user limit
