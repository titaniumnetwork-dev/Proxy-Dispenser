import { db } from "@db";
import { categoryAutocomplete } from "@utils/autocomplete";
import { EmbedPaginator } from "@utils/embedPaginator";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	Command,
	type CommandContext,
	createStringOption,
	Declare,
	Embed,
	Options,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	category: createStringOption({
		description: "Filter by a specific category (default: all)",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
};

@Declare({
	name: "history",
	description: "View your previously received proxy links",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class HistoryCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(true);

		const guildId = ctx.guildId;
		const userId = ctx.author.id;
		const categoryFilter = ctx.options.category as string;

		const [, error, userRow] = await t(
			db.query.guildUsers.findFirst({
				where: (u, { eq, and }) =>
					and(eq(u.guildId, guildId), eq(u.userId, userId)),
				columns: { receivedLinks: true },
			}),
		);
		if (error) {
			ctx.client.logger.error(`Failed to fetch user history: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching your history")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const receivedLinks = userRow?.receivedLinks ?? [];
		if (receivedLinks.length === 0) {
			await ctx.editOrReply({
				content: "You haven't received any proxy links yet.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let filtered = receivedLinks;
		if (categoryFilter) {
			const [, linksError, categoryLinks] = await t(
				db.query.links.findMany({
					where: (l, { eq, and }) =>
						and(eq(l.guildId, guildId), eq(l.categoryId, categoryFilter)),
					columns: { link: true },
				}),
			);
			if (linksError || !categoryLinks) {
				ctx.client.logger.error(
					`Failed to fetch category links: ${linksError}`,
				);
				await ctx.editOrReply({
					embeds: [createUnexpectedErrorEmbed("filtering by category")],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			const linksByCategory = new Set(categoryLinks.map((l) => l.link));
			filtered = receivedLinks.filter((link) => linksByCategory.has(link));
		}

		if (filtered.length === 0) {
			await ctx.editOrReply({
				content: categoryFilter
					? `You haven't received any links for **${categoryFilter}**.`
					: "You haven't received any proxy links yet.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const linksPerPage = 10;
		const pages: Embed[] = [];
		const totalPages = Math.ceil(filtered.length / linksPerPage);

		for (let i = 0; i < totalPages; i++) {
			const pageLinks = filtered.slice(
				i * linksPerPage,
				(i + 1) * linksPerPage,
			);
			const description = pageLinks
				.map((link, idx) => `${i * linksPerPage + idx + 1}. ${link}`)
				.join("\n");

			const embed = new Embed()
				.setColor("#5865F2")
				.setTitle(
					categoryFilter ? `Link History - ${categoryFilter}` : "Link History",
				)
				.setDescription(description)
				.setFooter({
					text: `${filtered.length} link${filtered.length !== 1 ? "s" : ""} total`,
				});

			pages.push(embed);
		}

		const paginator = new EmbedPaginator(ctx, pages, true);
		await paginator.start();
	}
}
