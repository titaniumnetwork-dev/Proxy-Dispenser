import { DISCORD_ID_PARTS } from "@consts";
import { db } from "@db";
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	ActionRow,
	type CommandContext,
	createStringOption,
	Declare,
	Embed,
	Options,
	StringSelectMenu,
	StringSelectOption,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const MAX_CATEGORIES = 25 * 4; // 25 is the limit for dropdowns

const options = {
	category: createStringOption({
		description: "Only show a specific category on the panel (Optional)",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
};

@Declare({
	name: "panel",
	description: "Display the proxy dispenser panel",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class PanelCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const guildId = ctx.guildId;
		const categoryFilter = ctx.options.category as string | undefined;

		const [ok, error, categories] = await t(
			db.query.categories.findMany({
				where: (categories, { eq, and }) =>
					categoryFilter
						? and(
								eq(categories.guildId, guildId),
								eq(categories.categoryId, categoryFilter),
							)
						: eq(categories.guildId, guildId),
				columns: { categoryId: true, emojiId: true },
			}),
		);
		if (!ok || !categories) {
			ctx.client.logger.error(`Failed to fetch categories: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching categories")],
			});
			return;
		}

		if (categories.length === 0) {
			await ctx.editOrReply({
				content: "No categories found.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const visibleCategories = categories.slice(0, MAX_CATEGORIES);

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Proxy Dispenser")
			.setDescription(
				"Choose a proxy below to receive a new link! Use /history to view previously requested links.",
			);

		const rows: ActionRow<StringSelectMenu>[] = [];
		for (let i = 0; i < visibleCategories.length; i += 25) {
			const chunk = visibleCategories.slice(i, i + 25);
			const menuIndex = Math.floor(i / 25);

			const menu = new StringSelectMenu()
				.setCustomId(`dispense:${DISCORD_ID_PARTS.separator}:${menuIndex}`)
				.setPlaceholder(
					rows.length === 0
						? "Select a proxy"
						: `More proxies (${chunk.length})`,
				);

			for (const category of chunk) {
				const option = new StringSelectOption()
					.setLabel(category.categoryId)
					.setValue(category.categoryId);
				if (category.emojiId) {
					option.setEmoji(category.emojiId);
				}
				menu.addOption(option);
			}

			rows.push(new ActionRow<StringSelectMenu>().setComponents([menu]));
		}

		await ctx.editOrReply({
			embeds: [embed],
			components: rows,
		});
	}
}
