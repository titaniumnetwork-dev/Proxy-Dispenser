import { Events } from "discord.js";
import { bans } from "../db.ts";
import config from "../config.json" with {type: "json"};

export default {
	name: Events.MessageCreate,
	execute: async (message) => {
        let userBanned = (await bans.get(message.member.id)) || false;

        if (config.banned) {
			for (let bannedRole of config.banned) {
				if (message.member.roles.cache.has(bannedRole)) {
					userBanned = true;
				}
			}
		}

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