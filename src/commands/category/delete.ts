import { db, schema } from "@db";
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { and, eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	category: createStringOption({
		description: "The category to delete",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "delete",
	description: "Delete a category and all its links",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class DeleteCategoryCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const categoryId = ctx.options.category;

		const [fetchOk, fetchError, linkRows] = await t(
			db.query.links.findMany({
				where: (l, { eq, and }) =>
					and(eq(l.guildId, guildId), eq(l.categoryId, categoryId)),
				columns: { link: true },
			}),
		);
		if (!fetchOk) {
			ctx.client.logger.error(
				`Failed to fetch links before deletion: ${fetchError}`,
			);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(`deleting category **${categoryId}**`),
				],
				flags,
			});
			return;
		}

		const [deleteOk, deleteError, result] = await t(
			db
				.delete(schema.categories)
				.where(
					and(
						eq(schema.categories.guildId, guildId),
						eq(schema.categories.categoryId, categoryId),
					),
				)
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (!deleteOk) {
			ctx.client.logger.error(`Failed to delete category: ${deleteError}`);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(`deleting category **${categoryId}**`),
				],
				flags,
			});
			return;
		}

		if (result.length === 0) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** not found`,
				flags,
			});
			return;
		}

		if (linkRows.length > 0) {
			const linkUrls = new Set(linkRows.map((l) => l.link));

			const [usersOk, usersError, guildUserRows] = await t(
				db.query.guildUsers.findMany({
					where: (u, { eq }) => eq(u.guildId, guildId),
					columns: { userId: true, receivedLinks: true },
				}),
			);
			if (!usersOk) {
				ctx.client.logger.error(
					`Failed to fetch guild users for receivedLinks cleanup: ${usersError}`,
				);
			} else if (guildUserRows) {
				const toUpdate = guildUserRows.filter((u) =>
					u.receivedLinks.some((url) => linkUrls.has(url)),
				);

				await Promise.all(
					toUpdate.map(async (u) => {
						const [updateOk, updateError] = await t(
							db
								.update(schema.guildUsers)
								.set({
									receivedLinks: u.receivedLinks.filter(
										(url) => !linkUrls.has(url),
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
		}

		await ctx.editOrReply({
			content: `Deleted category **${categoryId}** and all its links`,
			flags,
		});
	}
}
