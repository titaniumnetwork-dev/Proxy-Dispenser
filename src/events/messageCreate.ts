import { createEvent } from "seyfert";

export default createEvent({
	data: { name: "messageCreate" },
	async run(message, client) {
		if (message.author?.bot) return;

		const content = message.content?.trim();
		if (!content) return;

		if (content.startsWith("/proxy")) {
			await client.messages.write(message.channelId, {
				content: `quit using /proxy ya blockhead. go to the panel to request links`, // change later
			});
		}

		return;
	},
});
