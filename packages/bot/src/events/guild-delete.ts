import { db, schema } from "@dispenser/db";
import { eq } from "drizzle-orm";
import { createEvent } from "seyfert";

export default createEvent({
	data: { name: "guildDelete" },
	async run(unguild, client) {
		// unguild is the server from which the bot was removed or deleted
		// It is also possible that the server was simply deleted
		if (unguild.unavailable) return;

		client.logger.info(`I was removed from: ${unguild.id}`);

		await db.delete(schema.guild).where(eq(schema.guild.guildId, unguild.id));

		client.logger.info(`Cleaned up data for former guild: ${unguild.id}`);
	},
});
