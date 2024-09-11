import fs from "node:fs";
import path from "node:path";
import { Client, GatewayIntentBits, Collection } from "discord.js";

interface DiscordClient extends Client {
	commands?: Collection<string, { data; execute }>;
	buttons?: Collection<string, { name: string; execute }>;
}

const client: DiscordClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
	],
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

client.buttons = new Collection();
const buttonsPath = path.join(import.meta.dirname, "buttons");
const buttonFiles = fs.readdirSync(buttonsPath);

for (const file of buttonFiles) {
	const filePath = path.join(buttonsPath, file);
	const button = (await import(filePath)).default;
	if ("name" in button && "execute" in button) {
		client.buttons.set(button.name, button);
	} else {
		console.log(
			`The button at ${filePath} is missing a required "name" or "execute" property.`
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
