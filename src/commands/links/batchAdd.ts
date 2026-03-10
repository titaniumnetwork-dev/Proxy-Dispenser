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

		const guildId = ctx.guildId;
		const categoryId = ctx.options.category as string | undefined;

		if (categoryId) {
			const modal = this.createLinksModal(categoryId, false);
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
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching categories")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (categories.length === 0) {
			await ctx.editOrReply({
				content:
					"No categories exist yet.\n\nUse `/category create` to create your first category.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const categoryMenu = new StringSelectMenu()
			.setCustomId(`${CATEGORY_SELECT_PREFIX}${DISCORD_ID_PARTS.separator}`)
			.setPlaceholder("Select a category");

		for (const category of categories) {
			categoryMenu.addOption(
				new StringSelectOption()
					.setLabel(category.categoryId)
					.setValue(category.categoryId),
			);
		}

		const row = new ActionRow<StringSelectMenu>().setComponents([categoryMenu]);

		await ctx.editOrReply({
			content: "Select a category to add links to:",
			components: [row],
			flags: MessageFlags.Ephemeral,
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
