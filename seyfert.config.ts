import { config } from "seyfert";

if (!process.env.BOT_TOKEN) {
	throw new Error("Missing Discord Bot Token!");
}

export default config.bot({
	token: process.env.BOT_TOKEN,
	locations: {
		base: "src",
		commands: "commands",
		events: "events",
		components: "components",
	},
	intents: ["Guilds", "GuildMessages", "MessageContent"],
});
