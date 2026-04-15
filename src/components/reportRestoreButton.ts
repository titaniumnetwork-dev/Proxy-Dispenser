import { db, schema } from "@db";
import { and, eq } from "drizzle-orm";
import { ComponentCommand, type ComponentContext, Embed } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const restorePrefix = "report-restore:";

export default class ReportRestoreButton extends ComponentCommand {
	componentType = "Button" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return ctx.customId.startsWith(restorePrefix);
	}

	async run(ctx: ComponentContext<typeof this.componentType>) {
		if (!ctx.guildId) {
			await ctx.interaction.editOrReply({
				content: "This can only be used in a server.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const guildId = ctx.guildId;

		const [, userId, categoryId, ...linkParts] = ctx.customId.split(":");
		const link = linkParts.join(":");
		if (!userId || !categoryId || !link) {
			await ctx.interaction.editOrReply({
				content: "Invalid restore details on this report.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const [userOk, userError, userRow] = await t(
			db.query.guildUsers.findFirst({
				where: (u, { eq, and }) =>
					and(eq(u.guildId, guildId), eq(u.userId, userId)),
				columns: { receivedLinks: true, timesUserCycle: true },
			}),
		);
		if (!userOk || !userRow) {
			ctx.client.logger.error(
				`Failed to fetch user ${userId} for report restore: ${userError}`,
			);
			await ctx.interaction.editOrReply({
				content: "Failed to restore the user's link counter.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const filteredReceivedLinks = userRow.receivedLinks.filter(
			(receivedLink) => receivedLink !== link,
		);
		const [restoreOk, restoreError] = await t(
			db
				.update(schema.guildUsers)
				.set({
					receivedLinks: filteredReceivedLinks,
					timesUserCycle: Math.max(0, userRow.timesUserCycle - 1),
				})
				.where(
					and(
						eq(schema.guildUsers.guildId, guildId),
						eq(schema.guildUsers.userId, userId),
					),
				),
		);
		if (!restoreOk) {
			ctx.client.logger.error(
				`Failed to restore report user ${userId}: ${restoreError}`,
			);
			await ctx.interaction.editOrReply({
				content: "Failed to restore the user's link counter.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const [deleteOk, deleteError] = await t(
			db
				.delete(schema.links)
				.where(
					and(
						eq(schema.links.guildId, guildId),
						eq(schema.links.categoryId, categoryId),
						eq(schema.links.link, link),
					),
				),
		);
		if (!deleteOk) {
			ctx.client.logger.error(`Failed to delete reported link: ${deleteError}`);
			await ctx.interaction.editOrReply({
				content: "Failed to remove the reported link from the database.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const [usersOk, usersError, guildUsers] = await t(
			db.query.guildUsers.findMany({
				where: (u, { eq }) => eq(u.guildId, guildId),
				columns: { userId: true, receivedLinks: true },
			}),
		);
		if (!usersOk) {
			ctx.client.logger.error(
				`Failed to fetch guild users for report cleanup: ${usersError}`,
			);
		} else if (guildUsers) {
			const toUpdate = guildUsers.filter(
				(u) => u.userId !== userId && u.receivedLinks.includes(link),
			);

			await Promise.all(
				toUpdate.map(async (u) => {
					const [updateOk, updateError] = await t(
						db
							.update(schema.guildUsers)
							.set({
								receivedLinks: u.receivedLinks.filter(
									(receivedLink) => receivedLink !== link,
								),
							})
							.where(
								and(
									eq(schema.guildUsers.guildId, guildId),
									eq(schema.guildUsers.userId, u.userId),
								),
							),
					);
					if (!updateOk) {
						ctx.client.logger.error(
							`Failed to clean receivedLinks for user ${u.userId}: ${updateError}`,
						);
					}
				}),
			);
		}

		const originalMessage = ctx.interaction.message;
		if (!originalMessage) {
			await ctx.interaction.editOrReply({
				content:
					"Restored and removed the link, but cannot update the original report.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const originalEmbed = originalMessage.embeds?.[0];
		const resolvedEmbed = new Embed()
			.setColor("#57F287")
			.setTitle("Link Report (Restored & Removed)")
			.setDescription(`Handled by <@${ctx.author.id}>`);

		if (originalEmbed) {
			const fields = originalEmbed.fields ?? [];
			for (const field of fields) {
				resolvedEmbed.addFields({
					name: field.name,
					value: field.value,
					inline: field.inline,
				});
			}
		}

		resolvedEmbed.setTimestamp();

		const [editOk, editError] = await t(
			originalMessage.edit({
				embeds: [resolvedEmbed],
				components: [],
			}),
		);
		if (!editOk) {
			ctx.client.logger.error(
				`Failed to update report message after restore: ${editError}`,
			);
		}

		await ctx.interaction.editOrReply({
			content:
				"Restored the reported user's link count by 1 and removed the link.",
			flags: MessageFlags.Ephemeral,
		});
	}
}
