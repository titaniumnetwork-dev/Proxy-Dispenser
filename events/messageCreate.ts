import { Events } from "discord.js";
import config from "../config.json" with {type: "json"};

export default {
	name: Events.MessageCreate,
	execute(message) {
        if (message.content.startsWith("/proxy") || message.content.startsWith("%proxy")) {
            message.reply({
                content: config.fail || "",
                files: ["./assets/proxyfail.gif"]
            })
        }
    }
}