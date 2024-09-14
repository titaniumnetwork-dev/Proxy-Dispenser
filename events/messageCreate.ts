import { Events } from "discord.js";
import { bans } from "../db.ts";
import config from "../config.json" with {type: "json"};

export default {
	name: Events.MessageCreate,
	execute: async (message) => {
        const userBanned = (await bans.get(message.author.id)) || false;

		if (userBanned) {
			return;
		}

        if (message.content.startsWith("/proxy") || message.content.startsWith("%proxy")) {
            message.reply({
                content: config.fail || "",
                files: ["./assets/proxyfail.gif"]
            })
        }
    }
}