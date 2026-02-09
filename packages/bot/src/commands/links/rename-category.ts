/**
 * @fileoverview A slash subcommand to rename a category in a guild.
 */
import { db, schema } from "@dispenser/db";
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/info-embeds";
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
		description: "The existing category to rename",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	"new-category": createStringOption({
		description: "The new category name",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether the response should be ephemeral",
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

		const ephemeral = ctx.options.ephemeral ?? true;
		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;
		// We need to yield some time for DB operations
		await ctx.deferReply(ephemeral);

		const [, error] = await t(
			Promise.resolve(
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
			),
		);

		if (error) {
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`renaming category **${ctx.options.category}** to **${ctx.options["new-category"]}**`,
					),
				],
				flags,
			});
			ctx.client.logger.error(`Failed to rename category: ${error}`);
			return;
		}

		await ctx.editOrReply({
			content: `Renamed category **${ctx.options.category}** to **${ctx.options["new-category"]}**`,
			flags,
		});
	}
}
