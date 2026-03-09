/**
 * @fileoverview A slash subcommand to remove a link from a guild.
 */

import { categoryAutocomplete, linkAutocomplete } from "@utils/autocomplete";
import { and, eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";
import { IDLE_TIMEOUT } from "@/consts";
import { db, schema } from "@/db";
import {
	ButtonPaginator,
	PaginatorButtonId,
} from "@/utils/embedButtonPaginator";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";

const options = {
	link: createStringOption({
		description: "The link to remove",
		required: true,
		autocomplete: linkAutocomplete,
	}),
	category: createStringOption({
		description:
			"The category of the link. Use this if the link exists in multiple categories.",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
	ephemeral: createBooleanOption({
		description: "Whether to respond ephemerally",
		required: false,
	}),
};

@Declare({
	name: "remove",
	description: "Remove a link",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class RemoveCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		// We need to yield some time for DB operations
		const ephemeral = ctx.options.ephemeral ?? false;
		await ctx.deferReply(ephemeral);
		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

		const guildId = ctx.guildId;
		const link = ctx.options.link;
		const category = ctx.options.category;

		const [, error, matchingLinks] = await t(
			db.query.links.findMany({
				where: (links, { eq, and }) =>
					and(eq(links.guildId, guildId), eq(links.link, link)),
			}),
		);
		if (error) {
			ctx.client.logger.error(`Failed to find link: ${error}`);
		}
		if (!matchingLinks) {
			ctx.client.logger.error(`Links query returned an unexpected null result`);
		}
		if (error || !matchingLinks) {
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`finding link \`${link}\``)],
				flags,
			});
			return;
		}

		if (matchingLinks.length === 0) {
			await ctx.editOrReply({ content: `Link \`${link}\` not found`, flags });
			return;
		}

		if (category) {
			const [, error] = await t(
				db
					.delete(schema.links)
					.where(
						and(
							eq(schema.links.guildId, ctx.guildId),
							eq(schema.links.link, link),
							eq(schema.links.categoryId, category),
						),
					),
			);
			if (error) {
				ctx.client.logger.error(`Failed to remove link: ${error}`);
				await ctx.editOrReply({
					embeds: [
						createUnexpectedErrorEmbed(
							`removing link \`${link}\` from category **${category}**`,
						),
					],
				});
				return;
			}

			await ctx.editOrReply({
				content: `Removed link \`${link}\` from category **${category}**`,
				flags,
			});
			return;
		}

		if (matchingLinks.length === 1) {
			const firstLink = matchingLinks[0];
			if (!firstLink) {
				ctx.client.logger.error(
					`Link entry is unexpectedly null after matching`,
				);
				await ctx.editOrReply({
					embeds: [
						createUnexpectedErrorEmbed(
							`removing link \`${link}\` from category **${category}**`,
						),
					],
					flags,
				});
				return;
			}
			const [, error] = await t(
				db.delete(schema.links).where(eq(schema.links.id, firstLink.id)),
			);
			if (error) {
				ctx.client.logger.error(`Failed to remove link: ${error}`);
				await ctx.editOrReply({
					embeds: [
						createUnexpectedErrorEmbed(
							`removing link \`${link}\` from category **${category}**`,
						),
					],
					flags,
				});
				return;
			}

			await ctx.editOrReply({
				content: `Removed link \`${link}\` from category **${firstLink.categoryId}**`,
				flags,
			});
			return;
		}

		const paginator = new ButtonPaginator(
			matchingLinks.map((match) => ({
				id: `remove-link:${match.id}`,
				label: match.categoryId,
				style: ButtonStyle.Secondary,
			})),
		);

		let currentPage = 0;

		const message = await ctx.editOrReply(
			{
				content: `Link \`${link}\` exists in ${matchingLinks.length} categories\n\nWhich one do you want to remove?`,
				components: paginator.getPage(currentPage),
				flags,
			},
			true,
		);

		const collector = message.createComponentCollector({
			filter: (interaction) =>
				interaction.user.id === ctx.author.id && interaction.isButton(),
			idle: IDLE_TIMEOUT,
			onStop: async (reason) => {
				if (reason === "idle") {
					await message.edit({
						components: paginator.getPage(currentPage, true),
					});
				}
			},
		});

		collector.run(PaginatorButtonId.Cancel, async (interaction) => {
			await interaction.update({
				content: "Cancelled link removal",
				components: [],
			});
		});

		for (let page = 0; page < paginator.totalPages; page++) {
			collector.run(
				`${PaginatorButtonId.Prev}:${page}`,
				async (interaction) => {
					const targetPage = page - 1;
					if (targetPage >= 0) {
						currentPage = targetPage;
						await interaction.update({
							content: `Link \`${link}\` exists in \`${matchingLinks.length}\` categories\n\nWhich one do you want to remove?`,
							components: paginator.getPage(targetPage),
						});
					}
				},
			);
			collector.run(
				`${PaginatorButtonId.Next}:${page}`,
				async (interaction) => {
					const targetPage = page + 1;
					if (targetPage < paginator.totalPages) {
						currentPage = targetPage;
						await interaction.update({
							content: `Link \`${link}\` exists in \`${matchingLinks.length}\` categories\n\nWhich one do you want to remove?`,
							components: paginator.getPage(targetPage),
						});
					}
				},
			);
		}

		for (const match of matchingLinks) {
			collector.run(`remove-link:${match.id}`, async (interaction) => {
				const [, error] = await t(
					db.delete(schema.links).where(eq(schema.links.id, match.id)),
				);
				if (error) {
					ctx.client.logger.error(`Failed to remove link: ${error}`);
					await interaction.update({
						embeds: [createUnexpectedErrorEmbed(`removing link \`${link}\``)],
						components: [],
					});
					return;
				}

				await interaction.update({
					content: `Removed link \`${link}\` from category **${match.categoryId}**`,
					components: [],
				});
			});
		}
	}
}
