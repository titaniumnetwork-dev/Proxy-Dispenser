import fs from "node:fs";
import path from "node:path";
import { Client, GatewayIntentBits, Collection } from "discord.js";

interface DiscordClient extends Client {
	commands?: Collection<string, { data; execute }>;
}

const client: DiscordClient = new Client({
	intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
const commandsPath = path.join(import.meta.dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath);

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = (await import(filePath)).default;
	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(
			`The command at ${filePath} is missing a required "data" or "execute" property.`
		);
	}
}

const eventsPath = path.join(import.meta.dirname, "events");
const eventFiles = fs.readdirSync(eventsPath);

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = (await import(filePath)).default;
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(process.env.TOKEN);
