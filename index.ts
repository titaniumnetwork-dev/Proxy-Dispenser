import { Client, Events, GatewayIntentBits, ActivityType } from "discord.js";
import chalk from "chalk";
import terminalLink from "terminal-link";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
	readyClient.user.setPresence({
		activities: [{ name: "with proxies", type: ActivityType.Playing }],
		status: "online",
	});

	console.clear();
	console.log(chalk.bold(chalk.greenBright("Proxy Dispenser Online")));
	const permissions = "8"; //Todo
	const inviteLink = terminalLink(
		"Invite",
		`https://discord.com/oauth2/authorize?client_id=${readyClient.user.id}&permissions=${permissions}&integration_type=0&scope=bot`
	);
	console.log(`  Username: ${readyClient.user.tag}`);
	console.log(
		`  Status: ${Object.keys(ActivityType).find(
			(key) =>
				ActivityType[key] === readyClient.user.presence.activities[0].type
		)} ${readyClient.user.presence.activities[0].name}`
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
});

client.login(process.env.TOKEN);
