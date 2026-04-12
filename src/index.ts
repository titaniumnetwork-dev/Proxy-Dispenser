import { Client } from "seyfert";

const client = new Client();

process.on("unhandledRejection", (error) => {
	console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});

client.start().then(
	() => client.uploadCommands({ cachePath: "./commands.json" }),
	(error) => {
		console.error("Failed to start bot. Error:", error);
		process.exit(1);
	},
);
