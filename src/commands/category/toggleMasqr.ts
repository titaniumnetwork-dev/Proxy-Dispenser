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
		description: "The category to toggle Masqr for",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	action: createStringOption({
		description: "Whether to enable or disable Masqr",
		required: true,
		choices: [
			{ name: "Enable", value: "add" },
			{ name: "Disable", value: "remove" },
		],
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "toggle-masqr",
	description: "Toggle Masqr licensing for a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ToggleMasqrCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const categoryId = ctx.options.category as string;
		const action = ctx.options.action;

		const [, error, result] = await t(
			db
				.update(schema.categories)
				.set({ masqrEnabled: action === "add" ? 1 : 0 })
				.where(
					and(
						eq(schema.categories.guildId, ctx.guildId),
						eq(schema.categories.categoryId, categoryId),
					),
				)
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (error) {
			ctx.client.logger.error(
				`Failed to set Masqr status for category: ${error}`,
			);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`setting Masqr status for category **${categoryId}**`,
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

		await ctx.editOrReply({
			content:
				action === "add"
					? `Enabled Masqr for category **${categoryId}**`
					: `Disabled Masqr for category **${categoryId}**`,
			flags,
		});
	}
}
