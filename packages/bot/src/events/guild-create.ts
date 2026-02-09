import { db, schema } from "@dispenser/db";
import { createEvent } from "seyfert";

export default createEvent({
	data: { name: "guildCreate" },
	async run(guild, client) {
		client.logger.info(`I was added to: ${guild.id}`);

		await db
			.insert(schema.guild)
			.values({
				guildId: guild.id,
			})
			.onConflictDoNothing();

		client.logger.debug(`Added guild to database: ${guild.id}`);
	},
});
