import { db, schema } from "@dispenser/db";
import { eq } from "drizzle-orm";
import { createEvent } from "seyfert";
import { t } from "try";

export default createEvent({
	data: { name: "guildDelete" },
	async run(unguild, client) {
		// unguild is the server from which the bot was removed or deleted
		// It is also possible that the server was simply deleted
		if (unguild.unavailable) return;

		client.logger.info(`I was removed from: ${unguild.id}`);

		const [_, removeGuildError] = await t(
			db.delete(schema.guild).where(eq(schema.guild.guildId, unguild.id)),
		);
		if (removeGuildError) {
			client.logger.error(
				`Failed to remove guild (${unguild.id}) from database: ${removeGuildError}`,
			);
			return;
		}
		client.logger.debug(`Removed guild (${unguild.id}) from database`);
	},
});
