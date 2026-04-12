import {
	CATEGORY_SELECT_PREFIX,
	createLinksLabel,
	createSelectCustomID,
} from "@components/batchAddFormLinksModal";
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
	createBooleanOption,
	createStringOption,
	Declare,
	Modal,
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
		description: "The category to add the links to",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "batch-add",
	aliases: ["ba", "badd", "batchadd"],
	description: "Add links via a form interface",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class AddFormCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral =
			(ctx.options.ephemeral ?? true) ? MessageFlags.Ephemeral : undefined;

		const guildId = ctx.guildId;
		const categoryId = ctx.options.category as string | undefined;

		if (categoryId) {
			const modal = this.createLinksModal(categoryId, ephemeral !== undefined);
			await ctx.interaction.modal(modal);
			return;
		}

		const [ok, error, categories] = await t(
			db.query.categories.findMany({
				where: (categories, { eq }) => eq(categories.guildId, guildId),
				columns: { categoryId: true },
			}),
		);
		if (!ok || !categories) {
			ctx.client.logger.error(`Failed to fetch categories: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching categories")],
				flags: ephemeral,
			});
			return;
		}

		if (categories.length === 0) {
			await ctx.editOrReply({
				content:
					"No categories exist yet.\n\nUse `/category create` to create your first category.",
				flags: ephemeral,
			});
			return;
		}

		const visibleCategories = categories.slice(0, MAX_CATEGORIES);

		const rows: ActionRow<StringSelectMenu>[] = [];
		for (let i = 0; i < visibleCategories.length; i += 25) {
			const chunk = visibleCategories.slice(i, i + 25);
			const menuIndex = Math.floor(i / 25);

			const menu = new StringSelectMenu()
				.setCustomId(
					`${CATEGORY_SELECT_PREFIX}${DISCORD_ID_PARTS.separator}${menuIndex}`,
				)
				.setPlaceholder(
					rows.length === 0
						? "Select a category"
						: `More categories (${chunk.length})`,
				);

			for (const category of chunk) {
				menu.addOption(
					new StringSelectOption()
						.setLabel(category.categoryId)
						.setValue(category.categoryId),
				);
			}

			rows.push(new ActionRow<StringSelectMenu>().setComponents([menu]));
		}

		await ctx.editOrReply({
			content: "Select a category to add links to:",
			components: rows,
			flags: ephemeral,
		});
	}

	/**
	 * Creates a modal for adding links to a specific category.
	 * @param categoryId ID of the category to add links to.
	 * @param ephemeral Whether the modal should be ephemeral.
	 * @returns Modal for adding links.
	 */
	private createLinksModal(categoryId: string, ephemeral: boolean): Modal {
		const linksLabel = createLinksLabel();

		return new Modal()
			.setCustomId(createSelectCustomID({ categoryId, ephemeral }))
			.setTitle(`${categoryId} | Add Links`)
			.setComponents([linksLabel]);
	}
}
