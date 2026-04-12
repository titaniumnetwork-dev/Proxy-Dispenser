import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq, sql } from "drizzle-orm";
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
	name: createStringOption({
		description: "The name of the category to create",
		required: true,
	}),
	filterapi: createBooleanOption({
		description: "Enable filter API checking on this category",
		required: true,
	}),
	emoji: createStringOption({
		description: "An emoji to associate with this category (optional)",
		required: false,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "create",
	description: "Create a new category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class CreateCategoryCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const name = ctx.options.name.trim();

		if (!name) {
			await ctx.editOrReply({
				content: "Category name can't be empty",
				flags,
			});
			return;
		}

		const emoji = ctx.options.emoji ? ctx.options.emoji.trim() : "";

		const [, orderError, orderRow] = await t(
			db
				.select({
					sortOrder: sql<number>`COALESCE(MAX(${schema.categories.sortOrder}), -1)`,
				})
				.from(schema.categories)
				.where(eq(schema.categories.guildId, ctx.guildId)),
		);
		if (orderError) {
			ctx.client.logger.error(
				`Failed to fetch category sort order: ${orderError}`,
			);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`creating category **${name}**`)],
				flags,
			});
			return;
		}

		const nextOrder = (orderRow?.[0]?.sortOrder ?? -1) + 1;

		const [ok, error, result] = await t(
			db
				.insert(schema.categories)
				.values({
					guildId: ctx.guildId,
					categoryId: name,
					sortOrder: nextOrder,
					emojiId: emoji,
					filterApiEnabled: ctx.options.filterapi ? 1 : 0,
				})
				.onConflictDoNothing()
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (!ok) {
			ctx.client.logger.error(`Failed to create category: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`creating category **${name}**`)],
				flags,
			});
			return;
		}

		if (result.length === 0) {
			await ctx.editOrReply({
				content: `Category **${name}** already exists`,
				flags,
			});
			return;
		}

		const emojiDisplay = emoji ? ` with emoji ${emoji}` : "";
		await ctx.editOrReply({
			content: `Created category **${name}**${emojiDisplay}`,
			flags,
		});
	}
}
