import { db, schema } from "@dispenser/db";
import {
	Label,
	type Logger,
	ModalCommand,
	type ModalContext,
	TextInput,
} from "seyfert";
import { MessageFlags, TextInputStyle } from "seyfert/lib/types";
import { t } from "try";
import { DISCORD_ID_PARTS } from "@/consts";
import {
	createLinkResponse,
	LinkResponseType,
} from "@/utils/createAddLinkResponse";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";
import { LinkAdder } from "@/utils/linkAdder";

/**
 * Parts of the custom ID for the category select.
 */
export const CATEGORY_SELECT_PARTS = {
	idPrefix: "add-form-category",
	newSuffix: "new",
};

/**
 * Custom ID prefix for the category select modal.
 */
export const CATEGORY_SELECT_CUSTOM_ID = `${CATEGORY_SELECT_PARTS.idPrefix}${DISCORD_ID_PARTS.separator}`;
/**
 * Options for the select custom ID to assemble the parts.
 */
interface SelectCustomIDOptions {
	/**
	 * ID of the category.
	 */
	categoryId: string;
	/**
	 * Whether the modal should be ephemeral.
	 */
	ephemeral: boolean;
	/**
	 * Whether the modal should prompt the user to create a new category.
	 */
	newCategory?: boolean;
}
/**
 * Creates a custom ID for the category select modal.
 * @param options Options for the custom ID to assemble the parts.
 * @returns Custom ID.
 */
export function createSelectCustomID({
	categoryId,
	ephemeral,
	newCategory,
}: SelectCustomIDOptions) {
	return `${CATEGORY_SELECT_CUSTOM_ID}${categoryId}${DISCORD_ID_PARTS.separator}${newCategory ? "new" : ""}${ephemeral ? "ephemeral" : ""}`;
}

/**
 * Creates a label for the links input.
 * @returns Links input label.
 */
export function createLinksLabel() {
	const linksLabelInput = new TextInput()
		.setCustomId("links")
		.setStyle(TextInputStyle.Paragraph)
		.setPlaceholder(
			"https://example.com, https://example.net ...\nhttps://google.com",
		)
		.setRequired(true);

	const linksLabel = new Label()
		.setLabel("Link URLs (newlines, spaces, or commas)")
		.setComponent(linksLabelInput);

	return linksLabel;
}

/** Result of parsing a custom ID. */
interface ParsedCustomId {
	/**
	 * ID of the category.
	 */
	categoryId: string;
	/**
	 * Whether the modal should be ephemeral.
	 */
	ephemeral: boolean;
	/**
	 * Whether the modal should prompt the user to create a new category.
	 */
	newCategory?: boolean;
}

export default class AddLinksModal extends ModalCommand {
	override filter(ctx: ModalContext) {
		return (
			AddLinksModal.parseCustomId(ctx.customId, ctx.client.logger) !== null
		);
	}

	async run(ctx: ModalContext) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const parsedCustomId = AddLinksModal.parseCustomId(
			ctx.customId,
			ctx.client.logger,
		);
		if (!parsedCustomId) {
			ctx.client.logger.error(`Invalid custom ID: ${ctx.customId}`);
			return ctx.write({
				embeds: [
					createUnexpectedErrorEmbed(`getting the category for this modal`),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		const ephemeralMessage = parsedCustomId.ephemeral;
		const messageFlags = ephemeralMessage ? MessageFlags.Ephemeral : undefined;

		// Defer reply before DB operations
		await ctx.deferReply(ephemeralMessage);

		let categoryId = parsedCustomId.categoryId;
		let isNewCategory = false;

		if (categoryId === "new") {
			const categoryName = (
				ctx.interaction.getInputValue("category", true) as string
			).trim();

			if (!categoryName) {
				return ctx.editOrReply({
					content: "Category name can't be empty",
					flags: messageFlags,
				});
			}

			const [, categoryError] = await t(
				db.insert(schema.categories).values({
					guildId: ctx.guildId,
					categoryId: categoryName,
				}),
			);
			if (categoryError) {
				ctx.client.logger.error(`Failed to create category: ${categoryError}`);
				return ctx.editOrReply({
					embeds: [
						createUnexpectedErrorEmbed(`creating category **${categoryName}**`),
					],
					flags: messageFlags,
				});
			}

			ctx.client.logger.info(`Created new category: ${categoryName}`);
			categoryId = categoryName;
			isNewCategory = true;
		}

		const linksRaw = ctx.interaction.getInputValue("links", true) as string;
		const links = LinkAdder.parseLinks(linksRaw);

		const linkAdder = new LinkAdder({
			guildId: ctx.guildId,
			categoryId,
			logger: ctx.client.logger,
		});

		const linkAddResult = await linkAdder.add(links);

		if (!linkAddResult.dbSuccess) {
			return ctx.editOrReply({
				content: `Failed to add links to ${linkAddResult.newCategory || isNewCategory ? "new " : ""}category **${categoryId}**`,
				flags: messageFlags,
			});
		}

		const listResponse = createLinkResponse({
			linkAddResult,
			categoryId,
			isNewCategory,
		});

		switch (listResponse.type) {
			case LinkResponseType.AllDuplicates: {
				await ctx.editOrReply({
					content: "All links are duplicates",
					flags: messageFlags,
				});
				return;
			}
			case LinkResponseType.AllInvalid: {
				await ctx.editOrReply({
					content: "All links are invalid",
					flags: messageFlags,
				});
				return;
			}
			case LinkResponseType.NoValidLinks: {
				await ctx.editOrReply({
					content:
						"No valid links provided. Please enter at least one valid URL.",
					flags: messageFlags,
				});
				return;
			}
			case LinkResponseType.Success: {
				await ctx.editOrReply({
					content: listResponse.content,
					flags: messageFlags,
				});
				return;
			}
		}
	}

	/**
	 * Parses a custom ID (`add-form-category:categoryId:new?:ephemeral?`) for the batch add form links modal.
	 * @param customId Custom ID to parse.
	 * @param logger Seyfert Logger (from `ctx.client.logger`)
	 * @returns Parsed custom ID, or `null` if the custom ID is invalid.
	 */
	public static parseCustomId(
		customId: string,
		logger: Logger,
	): ParsedCustomId | null {
		const [idPrefix, categoryId, thirdPart, fourthPart, ...rest] =
			customId.split(":");

		if (idPrefix !== CATEGORY_SELECT_PARTS.idPrefix || !categoryId) {
			return null;
		}

		if (!thirdPart) {
			return { categoryId, newCategory: false, ephemeral: false };
		}

		if (thirdPart === "ephemeral") {
			return { categoryId, newCategory: false, ephemeral: true };
		}

		if (thirdPart === "new") {
			if (rest.length > 0) {
				logger.warn(`Unexpected parts in custom ID: ${rest}`);
				return null;
			}

			if (fourthPart === "ephemeral") {
				return { categoryId, newCategory: true, ephemeral: true };
			}
			return { categoryId, newCategory: true, ephemeral: false };
		}

		logger.warn(`Unknown third part in custom ID: ${thirdPart}`);
		return null;
	}
}
