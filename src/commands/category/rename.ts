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
		description: "The existing category to rename",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	"new-name": createStringOption({
		description: "The new category name",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "rename",
	description: "Rename a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class RenameCategoryCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;

		const [, error] = await t(
			db
				.update(schema.categories)
				.set({
					categoryId: ctx.options["new-name"],
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
						`renaming category **${ctx.options.category}** to **${ctx.options["new-name"]}**`,
					),
				],
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Renamed category **${ctx.options.category}** to **${ctx.options["new-name"]}**`,
			flags,
		});
	}
}
