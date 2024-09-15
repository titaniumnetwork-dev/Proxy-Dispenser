import { Events } from "discord.js";
import deployCommands from "../deploy-commands.ts";
import config from "../config.json" with {type: "json"};

export default {
	name: Events.GuildCreate,
	async execute(guild) {
		if (guild.id !== config.serverID) {
			await guild.leave();
			console.log(`Left unauthorized server: ${guild.name}`);
		}

		if (await guild.client.guilds.cache.has(config.serverID)) {
			const currentGuild = guild.client.guilds.cache.get(config.serverID);
			const guildCommands = await currentGuild.commands.fetch();	
			const historyCommand = guildCommands.find(
				(command) => command.name === "history"
			);
	
			guild.client.historyCommandID = historyCommand.id;
		}
	},
};
