import fs from "node:fs";
import path from "node:path";
import { REST, Routes } from "discord.js";
import config from "./config.json" with {type: "json"};

const commands: Array<string> = [];
const commandsPath = path.join(import.meta.dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath);

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = (await import(filePath)).default;
	if ("data" in command && "execute" in command) {
		commands.push(command.data.toJSON());
	} else {
		console.log(
			`The command at ${filePath} is missing a required "data" or "execute" property.`
		);
	}
}

const rest = new REST().setToken(process.env.TOKEN || "");

export default async function (clientID) {
	try {
		await rest.put(
			Routes.applicationGuildCommands(clientID, config.serverID || ""),
			{ body: commands }
		);
	} catch (error) {
		console.error(error);
	}
}
