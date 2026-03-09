/**
 * @fileoverview A slash subcommand to list links in a guild
 */

import { categoryAutocomplete } from "@utils/autocomplete";
import { sql } from "drizzle-orm";
import {
	AttachmentBuilder,
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";
import { db, schema } from "@/db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";
import { LinkListPaginator } from "@/utils/linkListPaginator";

const options = {
	category: createStringOption({
		description: "The category to list links from",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
	"raw-json": createBooleanOption({
		description:
			"Optionally, output the links as a raw JSON file attachment instead of a paginated embed",
		required: false,
	}),
	"display-user-stats": createBooleanOption({
		description: "Optionally, display how many users have received each link",
		required: false,
	}),
	ephemeral: createBooleanOption({
		description: "Respond empherally (default: true)",
		required: false,
	}),
};

@Declare({
	name: "list",
	description: "List all links",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ListCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? true;
		// We need to yield some time for DB operations
		await ctx.deferReply(ephemeral);
		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

		const guildId = ctx.guildId;
		const [, error, links] = await t(
			db.query.links.findMany({
				where: (links, { eq, and }) =>
					ctx.options.category
						? and(
								eq(links.guildId, guildId),
								eq(links.categoryId, ctx.options.category),
							)
						: eq(links.guildId, guildId),
			}),
		);
		if (error) {
			ctx.client.logger.error(`Failed to list links: ${error}`);
		}
		if (!links) {
			ctx.client.logger.error(`Links query returned an unexpected null result`);
		}
		if (error || !links) {
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("listing links")],
				flags,
			});
			return;
		}

		const description = ctx.options.category
			? `List of the links in category ${ctx.options.category}`
			: "List of the links in the server";

		if (ctx.options["raw-json"]) {
			const attachment = new AttachmentBuilder()
				.setName(`links-${ctx.guildId}.json`)
				.setFile(
					"buffer",
					Buffer.from(
						JSON.stringify(
							links.map((link) => ({
								link: link.link,
								categoryId: link.categoryId,
							})),
						),
					),
				);

			await ctx.editOrReply({
				content: description,
				files: [attachment],
				flags,
			});
			return;
		}

		const noLinksText =
			"There are no links in this server\n\nUse `/links add` to add your first link";
		const linksByCategory: Record<string, string[]> = {};
		let linkUserCounts: Map<string, number> = new Map();
		if (links.length !== 0) {
			if (ctx.options["display-user-stats"]) {
				const [, statsError, stats] = await t(
					db
						.select({
							link: schema.links.link,
							userCount: sql<number>`(
								SELECT COUNT(DISTINCT ${schema.guildUsers.userId})
								FROM ${schema.guildUsers}, json_each(${schema.guildUsers.receivedLinks})
								WHERE ${schema.guildUsers.guildId} = ${schema.links.guildId}
								AND json_each.value = ${schema.links.link}
							)`.as("user_count"),
						})
						.from(schema.links)
						.where(
							ctx.options.category
								? sql`${schema.links.guildId} = ${guildId} AND ${schema.links.categoryId} = ${ctx.options.category}`
								: sql`${schema.links.guildId} = ${guildId}`,
						)
						.groupBy(schema.links.link),
				);
				if (!statsError && stats) {
					linkUserCounts = new Map(stats.map((s) => [s.link, s.userCount]));
				}
			}

			for (const link of links) {
				const list = linksByCategory[link.categoryId] ?? [];
				list.push(link.link);
				linksByCategory[link.categoryId] = list;
			}
		}

		await LinkListPaginator.createLinkListEmbed({
			ctx,
			mdTitle: "Server Link List",
			description,
			noLinksText,
			linksByCategory,
			linkUserCounts: ctx.options["display-user-stats"]
				? linkUserCounts
				: undefined,
			ephemeral,
		});
	}
}
