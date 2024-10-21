# Proxy Dispenser

The most advanced proxy dispenser bot for Discord. Used in Titanium Network.


## Setup Bot

1. Go to the [Discord developer portal](https://discord.com/developers/applications).

2. Create a new application.

3. Go to the Bot tab.

4. Choose a username, profile picture, and banner. Toggle on Message Content Intent.

5. It is recommended to not make your bot public so others can add it to their servers. To do this first go to the Installation tab, set the installation link to none, then go to the Bot tab and uncheck Public Bot.

6. Rename `.env.example` to `.env`

7. Next click Reset Token and add it to the `TOKEN` field of your `.env` file.

> [!TIP]
> If you're using Masqr, paste your PSK into `.env` too.

> [!TIP]
> Use the Emojis tab to upload emoji to the application instead of the server.

## Setup

Node.js v22.6.0 is required. You can upgrade using `nvm`.

```bash
nvm i 22.6.0
nvm alias default 22.6.0
```

This project uses `pnpm` as the package manager. Install pnpm from npm using `npm install -g pnpm`.

## Config

First rename `config.example.json` to `config.json`.

Use the template and replace the values with the correct ones.

```yaml
{
  "serverID": "Server ID",
  "theme": "Hex Code",
  "limit": 3,
  "reportsID": "Reports Channel ID", # Leave blank to disable reporting.
  "fail": "Requesting a proxy has changed, use <#Channel ID> to request a proxy link.",
  "bonus": [
    {
      "roleID": "Role ID",
      "limit": 6
    }
  ],
  "banned": ["Role ID"],
  "activity": {
    "type": "Playing", # Competing, Playing, Streaming, Listening, or Watching
    "name": "with proxies"
  },
  "docsURL": "https://documentation-url.com",
  "masqrURL": "https://masqr-url.com",
  "services": [
    {
      "name": "Service Name",
      "emoji": "Emoji ID", # Optional
      "masqr": false # If Masqr is enabled for this service
    }
  ]
}
```

## Running

> [!TIP]
> Run `pnpm install` to install the required dependencies.

- Run `pnpm start` to start the bot.

- Run `pnpm run dev` to automatically refresh the bot when a file is changed.

An invite link for the bot will be generated in the console.

## Commands

### Everyone

| Command                       | Description                       |
| ----------------------------- | --------------------------------- |
| `/docs`                       | Provides the documentation link.  |
| `/speechbubble [file] [flip]` | Adds a speech bubble to an image. |
| `/history [service]`          | View previously requested links.  |

### Administrator

| Command                       | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `/panel`                      | Generates the proxy panel.                             |
| `/reset`                      | Reset the monthly link count for all users.            |
| `/reset-user [user]`          | Reset the monthly link count for a user.               |
| `/say [text]`                 | Say anything through the bot.                          |
| `/links [service]`            | View all links for a service in the database.          |
| `/add-links [service]`         | Add links to the database.                             |
| `/remove-links [service]`      | Remove links from the database.                        |
| `/remove-all-links [service]` | Removes every link link for a service in the database. |
| `/ban [user]`                 | Ban a user from using the bot.                         |
| `/unban [user]`               | Unban a user from using the bot.                       |

### Context Menu (Administrator)

Right click a user and hover over Apps.

| Name  | Equivalent Command   |
| ----- | -------------------- |
| Reset | `/reset-user [user]` |
| Ban   | `/ban [user]`        |
| Unban | `/unban [user]`      |

## License

Proxy Dispenser uses the AGPL-3.0 license.
