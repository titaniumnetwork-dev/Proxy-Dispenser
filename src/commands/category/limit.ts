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
	createIntegerOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	category: createStringOption({
		description: "The category to set the limit for",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	limit: createIntegerOption({
		description:
			"Max links a user may receive from this category (omit to inherit the guild default)",
		required: false,
		min_value: 1,
		max_value: 1000,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-limit",
	description:
		"Set or clear the per-user dispense limit for a category (pool)",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetLimitCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const categoryId = ctx.options.category;
		const limit = ctx.options.limit ?? null;

		const [resultOk, resultErr, result] = await t(
			db
				.update(schema.categories)
				.set({ dispenserLimit: limit })
				.where(
					and(
						eq(schema.categories.guildId, ctx.guildId),
						eq(schema.categories.categoryId, categoryId),
					),
				)
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (!resultOk) {
			ctx.client.logger.error(`Failed to set limit for category: ${resultErr}`);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`setting limit for category **${categoryId}**`,
					),
				],
				flags,
			});
			return;
		}

		if (result.length === 0) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** not found.`,
				flags,
			});
			return;
		}

		if (limit !== null) {
			await ctx.editOrReply({
				content: `Set per-user link limit for category **${categoryId}** to **${limit}**.`,
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Cleared the per-user link limit for **${categoryId}**. It will now use the guild default.`,
			flags,
		});
	}
}
