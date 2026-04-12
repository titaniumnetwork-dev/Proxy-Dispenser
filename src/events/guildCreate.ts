import { db, schema } from "@db";
import { createEvent, Embed } from "seyfert";
import { t } from "try";

export default createEvent({
	data: { name: "guildCreate" },
	async run(guild, client) {
		client.logger.info(`I was added to: ${guild.id}`);

		const [insertGuildOk, insertGuildError] = await t(
			db
				.insert(schema.guild)
				.values({
					guildId: guild.id,
				})
				.onConflictDoNothing(),
		);
		if (!insertGuildOk) {
			client.logger.error(
				`Failed to add guild (${guild.id}) to database: ${insertGuildError}`,
			);
			return;
		}
		client.logger.debug(`Added guild (${guild.id}) to database`);

		if (!guild.systemChannelId) {
			client.logger.info(
				`Skipped sending welcome message to guild (${guild.id}) (no system channel)`,
			);
			return;
		}

		const [channelOk, channelError, systemChannel] = await t(
			client.channels.fetch(guild.systemChannelId),
		);
		if (!channelOk || !systemChannel) {
			client.logger.error(
				`Failed to fetch system channel for guild (${guild.id}): ${channelError}`,
			);
			return;
		}

		const [messageOk, messageError] = await t(
			client.messages.write(systemChannel.id, {
				embeds: [
					new Embed().setTitle("Welcome to Dispenser!").setDescription(
						`
						Dispenser is a link management utility that protects proxy links on your Discord server. It is intelligent and prevents your service from burning through links through advanced distribution systems. To get started, you can add your first link with \`/links add\` if you have a link list ready, configure options such as the log channel, monthly cycle, or monthly limit, and finally create a panel channel with \`/dispense create-panel\`. You may also forgo a panel and instruct your users to run \`/dispense get-link\` to receive a link.
						
						Server Managers and Administrators - Configure authorized roles for the bot, and add overrides as needed (Recommended: Make \`/links\` and \`/category\` available to link deployers). \`/docs\` and \`/history\` are available to all users.`,
					),
				],
			}),
		);
		if (!messageOk) {
			client.logger.error(
				`Failed to send welcome message to guild (${guild.id}): ${messageError}`,
			);
		}
	},
});
