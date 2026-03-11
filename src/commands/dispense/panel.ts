import { CATEGORY_SELECT_PREFIX } from "@components/batchAddFormLinksModal";
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
	SubCommand
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

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
	defaultMemberPermissions: ["Administrator"],
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

		const [, error, categories] = await t(
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
		if (error) {
			ctx.client.logger.error(`Failed to fetch categories: ${error}`);
		}
		if (!categories) {
			ctx.client.logger.error(
				`Categories query returned an unexpected null result`,
			);
		}
		if (error || !categories) {
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

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Proxy Dispenser")
			.setDescription(
				"Choose a proxy below to receive a new link! Use /history to view previously requested links.",
			);
			
		const categoryMenu = new StringSelectMenu()
			.setCustomId(`${CATEGORY_SELECT_PREFIX}${DISCORD_ID_PARTS.separator}`)
			.setPlaceholder("Select a proxy");

		for (const category of categories) {
			const dropdown = new StringSelectOption()
				.setLabel(category.categoryId)
				.setValue(category.categoryId)
			if (category.emojiId) {
				dropdown.setEmoji(category.emojiId);
			}
			categoryMenu.addOption(dropdown);
		}

		const row = new ActionRow<StringSelectMenu>().setComponents([categoryMenu]);

		await ctx.editOrReply({
			embeds: [embed],
			components: [row],
		});
	}
}
