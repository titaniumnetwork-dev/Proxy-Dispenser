import { Events, ActivityType } from "discord.js";
import chalk from "chalk";
import terminalLink from "terminal-link";
import deployCommands from "../deploy-commands.ts";

export default {
	name: Events.ClientReady,
	once: true,
	execute(client) {
        deployCommands(client.user.id);

		client.user.setPresence({
			activities: [{ name: "with proxies", type: ActivityType.Playing }],
			status: "online",
		});

		console.clear();
		console.log(chalk.bold(chalk.greenBright("Proxy Dispenser Online")));
		const permissions = "8"; //Todo
		const inviteLink = terminalLink(
			"Invite",
			`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=${permissions}&integration_type=0&scope=bot`
		);
		console.log(`  Username: ${client.user.tag}`);
		console.log(
			`  Status: ${Object.keys(ActivityType).find(
				(key) => ActivityType[key] === client.user.presence.activities[0].type
			)} ${client.user.presence.activities[0].name}`
		);
		console.log(`  Invite Link: ${inviteLink}`);

		if (client.guilds.cache.size > 1) {
			client.guilds.cache.forEach(async (guild) => {
				if (guild.id !== process.env.SERVER_ID) {
					await guild.leave();
					console.log(`Left unauthorized server: ${guild.name}`);
				}
			});
		}
	},
};
