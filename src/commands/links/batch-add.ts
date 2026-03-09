/**
 * @fileoverview A slash subcommand that shows a form for batch adding links.
 * @module commands/links/batch-add
 */

import { categoryAutocomplete } from "@utils/autocomplete";
import {
	ActionRow,
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Label,
	Modal,
	Options,
	StringSelectMenu,
	StringSelectOption,
	SubCommand,
	TextInput,
} from "seyfert";
import { MessageFlags, TextInputStyle } from "seyfert/lib/types";
import { t } from "try";
import {
	CATEGORY_SELECT_PARTS,
	createLinksLabel,
	createSelectCustomID,
} from "@/components/batch-add-form-links-modal";
import { DISCORD_ID_PARTS } from "@/consts";
import { db } from "@/db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";

const options = {
	category: createStringOption({
		description: "The category to add the links to",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
	ephemeral: createBooleanOption({
		description: "Respond with ephemeral messages (only visible to you)",
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
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const guildId = ctx.guildId;
		const categoryId = ctx.options.category as string | undefined;
		const ephemeral = ctx.options.ephemeral ?? false;

		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

		if (categoryId) {
			const modal = this.createLinksModal(categoryId, ephemeral);
			await ctx.interaction.modal(modal);
			return;
		}

		const [, error, categories] = await t(
			db.query.categories.findMany({
				where: (categories, { eq }) => eq(categories.guildId, guildId),
				columns: { categoryId: true },
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
			await ctx.write({
				embeds: [createUnexpectedErrorEmbed("fetching categories")],
				flags,
			});
			return;
		}

		if (categories.length === 0) {
			const modal = this.createFirstCategoryModal(ephemeral);
			await ctx.interaction.modal(modal);
			return;
		}

		const categoryMenu = new StringSelectMenu()
			.setCustomId(
				`${CATEGORY_SELECT_PARTS.idPrefix}${DISCORD_ID_PARTS.separator}${ephemeral ? DISCORD_ID_PARTS.ephemeralId : ""}`,
			)
			.setPlaceholder("Select a category");

		for (const category of categories) {
			categoryMenu.addOption(
				new StringSelectOption()
					.setLabel(category.categoryId)
					.setValue(category.categoryId),
			);
		}

		const row = new ActionRow<StringSelectMenu>().setComponents([categoryMenu]);

		await ctx.write({
			content: "Select a category to add links to:",
			components: [row],
			flags,
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

	/**
	 * Creates a modal for adding links to a new category.
	 * This is triggered in the event that the guild has no categories yet.
	 * @param ephemeral Whether the modal should be ephemeral.
	 * @returns Modal for adding links.
	 */
	private createFirstCategoryModal(ephemeral: boolean): Modal {
		const categoryInput = new TextInput()
			.setCustomId("category")
			.setStyle(TextInputStyle.Short)
			.setPlaceholder("The name of your main proxy service")
			.setRequired(true);

		const categoryLabel = new Label()
			.setLabel("Category Name")
			.setComponent(categoryInput);

		const linksLabel = createLinksLabel();

		return new Modal()
			.setCustomId(
				createSelectCustomID({
					categoryId: CATEGORY_SELECT_PARTS.newSuffix,
					ephemeral,
					newCategory: true,
				}),
			)
			.setTitle(`Add Links | Create your first category`)
			.setComponents([categoryLabel, linksLabel]);
	}
}
