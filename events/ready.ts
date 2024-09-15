import { Events, ActivityType } from "discord.js";
import chalk from "chalk";
import terminalLink from "terminal-link";
import deployCommands from "../deploy-commands.ts";
import { initDatabase } from "../db.ts";
import config from "../config.json" with {type: "json"};

const { activity }: Config = config;

export default {
	name: Events.ClientReady,
	once: true,
	execute: async (client) => {
		console.clear();

		if (await client.guilds.cache.has(config.serverID)) {
			const guild = client.guilds.cache.get(config.serverID);
			const guildCommands = await guild.commands.fetch();	
			const historyCommand = guildCommands.find(
				(command) => command.name === "history"
			);
	
			client.historyCommandID = historyCommand.id;
		}

		initDatabase();

		if (activity) {
			if ("name" in activity && "type" in activity) {
				if (ActivityType[activity.type] !== undefined) {
					client.user.setPresence({
						activities: [
							{ name: activity.name, type: ActivityType[activity.type] },
						],
						status: "online",
					});
				} else {
					console.error("Invalid activity type.");
				}
			} else {
				console.error("Activity is missing name or type.");
			}
		}

		const theme = chalk.hex(config.theme);
		console.log(chalk.bold(theme("Proxy Dispenser Online")));
		const permissions = "268618768";
		const inviteLink = terminalLink(
			"Invite",
			`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=${permissions}&integration_type=0&scope=bot`
		);
		console.log(`  Username: ${client.user.tag}`);
		if (client.user.presence.activities.length) {
			console.log(
				`  Status: ${Object.keys(ActivityType).find(
					(key) => ActivityType[key] === client.user.presence.activities[0].type
				)} ${client.user.presence.activities[0].name}`
			);
		}
		console.log(`  Invite Link: ${inviteLink}`);

		if (client.guilds.cache.size > 1) {
			client.guilds.cache.forEach(async (guild) => {
				if (guild.id !== config.serverID) {
					await guild.leave();
					console.log(`Left unauthorized server: ${guild.name}`);
				}
			});
		}
	},
};
