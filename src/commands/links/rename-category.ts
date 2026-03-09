/**
 * @fileoverview A slash subcommand to rename a category in a guild.
 */

import { categoryAutocomplete } from "@utils/autocomplete";
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
import { db, schema } from "@/db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";

const options = {
	category: createStringOption({
		description: "The existing category to rename",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	"new-category": createStringOption({
		description: "The new category name",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether to respond ephemerally",
		required: false,
	}),
};

@Declare({
	name: "rename-category",
	aliases: ["rcat", "rcategory"],
	description: "Renames a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class RenameCategoryCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? false;
		// We need to yield some time for DB operations
		await ctx.deferReply(ephemeral);
		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

		const [, error] = await t(
			db
				.update(schema.categories)
				.set({
					categoryId: ctx.options["new-category"],
				})
				.where(
					and(
						eq(schema.categories.guildId, ctx.guildId),
						eq(schema.categories.categoryId, ctx.options.category),
					),
				),
		);
		if (error) {
			ctx.client.logger.error(`Failed to rename category: ${error}`);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`renaming category **${ctx.options.category}** to **${ctx.options["new-category"]}**`,
					),
				],
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Renamed category **${ctx.options.category}** to **${ctx.options["new-category"]}**`,
			flags,
		});
	}
}
