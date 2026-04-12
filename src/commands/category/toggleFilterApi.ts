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
		description: "The category to toggle the filter API for",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	action: createStringOption({
		description: "Whether to enable or disable the filter API",
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
	name: "toggle-filter-api",
	description: "Toggle the filter API checking for a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ToggleFilterApiCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const categoryId = ctx.options.category;
		const action = ctx.options.action;

		const [ok, error, result] = await t(
			db
				.update(schema.categories)
				.set({ filterApiEnabled: action === "add" ? 1 : 0 })
				.where(
					and(
						eq(schema.categories.guildId, ctx.guildId),
						eq(schema.categories.categoryId, categoryId),
					),
				)
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (!ok) {
			ctx.client.logger.error(
				`Failed to set filter API status for category: ${error}`,
			);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`setting filter API status for category **${categoryId}**`,
					),
				],
				flags,
			});
			return;
		}

		if (result.length === 0) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** not found`,
				flags,
			});
			return;
		}

		if (action === "add") {
			await ctx.editOrReply({
				content: `Enabled filter API for category **${categoryId}**`,
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Disabled filter API for category **${categoryId}**`,
			flags,
		});
	}
}
