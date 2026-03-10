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
		description: "The category to set the emoji for",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	emoji: createStringOption({
		description: "The emoji to set (leave empty to remove)",
		required: false,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-emoji",
	description: "Set or update the emoji for a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetEmojiCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const categoryId = ctx.options.category;
		const emoji = (ctx.options.emoji as string | undefined)?.trim() ?? "";

		const [, error, result] = await t(
			db
				.update(schema.categories)
				.set({ emojiId: emoji })
				.where(
					and(
						eq(schema.categories.guildId, ctx.guildId),
						eq(schema.categories.categoryId, categoryId),
					),
				)
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (error) {
			ctx.client.logger.error(`Failed to set emoji for category: ${error}`);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`setting emoji for category **${categoryId}**`,
					),
				],
				flags,
			});
			return;
		}

		if (!result || result.length === 0) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** not found`,
				flags,
			});
			return;
		}

		if (emoji) {
			await ctx.editOrReply({
				content: `Set emoji for category **${categoryId}** to ${emoji}`,
				flags,
			});
		} else {
			await ctx.editOrReply({
				content: `Removed emoji from category **${categoryId}**`,
				flags,
			});
		}
	}
}
