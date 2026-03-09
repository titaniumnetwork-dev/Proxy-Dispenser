import { Client } from "seyfert";

const client = new Client();

client
	.start()
	.then(() => client.uploadCommands({ cachePath: "./commands.json" }));
