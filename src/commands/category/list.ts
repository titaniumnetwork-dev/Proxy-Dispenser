import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { asc, sql } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	Declare,
	Embed,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "list",
	description: "List all categories",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ListCategoriesCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;

		const [ok, error, categories] = await t(async () => {
			const cats = await db
				.select({
					categoryId: schema.categories.categoryId,
					emojiId: schema.categories.emojiId,
					masqrEnabled: schema.categories.masqrEnabled,
				})
				.from(schema.categories)
				.where(sql`${schema.categories.guildId} = ${ctx.guildId}`)
				.orderBy(
					asc(schema.categories.sortOrder),
					asc(schema.categories.categoryId),
				);

			const links = await db
				.select({ categoryId: schema.links.categoryId })
				.from(schema.links)
				.where(sql`${schema.links.guildId} = ${ctx.guildId}`);

			const countMap = new Map<string, number>();
			for (const link of links) {
				countMap.set(link.categoryId, (countMap.get(link.categoryId) ?? 0) + 1);
			}

			return cats.map((cat) => ({
				// mrrow
				...cat,
				linkCount: countMap.get(cat.categoryId) ?? 0,
			}));
		});

		if (!ok) {
			ctx.client.logger.error(`Failed to list categories: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("listing categories")],
				flags,
			});
			return;
		}

		if (categories.length === 0) {
			await ctx.editOrReply({
				content:
					"No categories found.\n\nUse `/category create` to create your first category.",
				flags,
			});
			return;
		}

		const lines = categories.map((cat, index) => {
			const emoji = cat.emojiId ? `${cat.emojiId} ` : "";
			const masqr = cat.masqrEnabled ? " [Masqr]" : "";
			const position = index + 1;
			return `${position}: ${emoji}**${cat.categoryId}**${masqr} - ${cat.linkCount} link${cat.linkCount !== 1 ? "s" : ""}`;
		});

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Categories")
			.setDescription(lines.join("\n"));

		await ctx.editOrReply({
			embeds: [embed],
			flags,
		});
	}
}
