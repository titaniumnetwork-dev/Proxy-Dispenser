import { config } from "seyfert";

export default config.bot({
	token: process.env.DISCORD_TOKEN ?? "",
	locations: {
		base: "src",
		events: "events",
		commands: "commands",
		components: "components",
	},
	intents: ["Guilds"],
});
