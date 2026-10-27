import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
setDefaultAutoSelectFamilyAttemptTimeout(500)
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import { Client } from "seyfert";
import { PermissionsHandleCommand } from "@utils/commandHandler";


const client = new Client();
client.setServices({ handleCommand: PermissionsHandleCommand });

client.start().then(
	() => client.uploadCommands({ cachePath: "./commands.json" }),
	(error) => {
		console.error("Failed to start bot. Error:", error);
		process.exit(1);
	},
);
