import { Client } from "seyfert";

const client = new Client();

client.start().then(
	() => client.uploadCommands({ cachePath: "./commands.json" }),
	(error) => {
		console.error("Failed to start bot. Error:", error);
		process.exit(1);
	},
);
