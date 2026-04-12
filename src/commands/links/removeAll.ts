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
		description: "The category to remove all links from",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "remove-all",
	description: "Remove all links from a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class RemoveAllCommand extends SubCommand {
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
				columns: { id: true, link: true },
			}),
		);
		if (!fetchOk) {
			ctx.client.logger.error(`Failed to fetch links: ${fetchError}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching links")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!linkRows || linkRows.length === 0) {
			await ctx.editOrReply({
				content: `No links found in category **${categoryId}**.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const count = linkRows.length;
		const linkUrls = new Set(linkRows.map((l) => l.link));

		const [deleteOk, deleteError] = await t(
			db
				.delete(schema.links)
				.where(
					and(
						eq(schema.links.guildId, guildId),
						eq(schema.links.categoryId, categoryId),
					),
				),
		);
		if (!deleteOk) {
			ctx.client.logger.error(`Failed to remove links: ${deleteError}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("removing links")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

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

		await ctx.editOrReply({
			content: `Removed **${count}** link${count !== 1 ? "s" : ""} from category **${categoryId}**.`,
			flags,
		});
	}
}
