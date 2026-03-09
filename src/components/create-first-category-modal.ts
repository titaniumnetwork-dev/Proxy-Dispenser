/**
 * @fileoverview Modal handler for creating the first category and adding links.
 * Triggered when a user runs `/links batch-add` and no categories exist.
 * @module modals/create-first-category-modal
 */

import { type Logger, ModalCommand, type ModalContext } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";
import { DISCORD_ID_PARTS } from "@/consts";
import { db, schema } from "@/db";
import {
	createLinkResponse,
	LinkResponseType,
} from "@/utils/createAddLinkResponse";
import {
	createErrorEmbed,
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";
import { LinkAdder } from "@/utils/linkAdder";

/**
 * Parts of the custom ID for the category select.
 */
export const CATEGORY_SELECT_PARTS = {
	idPrefix: "create-first-category",
};

/**
 * Custom ID for the category select.
 */
export const CATEGORY_SELECT_CUSTOM_ID = `${CATEGORY_SELECT_PARTS.idPrefix}${DISCORD_ID_PARTS.separator}`;

/**
 * Options for the category select custom ID.
 */
interface SelectCustomIDOptions {
	ephemeral: boolean;
}

/**
 * Creates a custom ID for the category select.
 * @param ephemeral Whether the modal should be ephemeral.
 * @returns Custom ID for the category select.
 */
export function createSelectCustomID(options: SelectCustomIDOptions): string {
	const { ephemeral } = options;
	return `${CATEGORY_SELECT_CUSTOM_ID}${ephemeral ? DISCORD_ID_PARTS.ephemeralId : ""}`;
}

export default class CreateFirstCategoryModal extends ModalCommand {
	override filter(ctx: ModalContext) {
		return this.parseCustomId(ctx.customId, ctx.client.logger) !== null;
	}

	async run(ctx: ModalContext) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const parsedCustomId = this.parseCustomId(ctx.customId, ctx.client.logger);
		if (!parsedCustomId) {
			ctx.client.logger.error(`Invalid custom ID: ${ctx.customId}`);
			return;
		}

		const ephemeral = parsedCustomId.ephemeral;
		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

		// We need to yield some time for DB operations
		await ctx.deferReply(ephemeral);

		const categoryId = (
			ctx.interaction.getInputValue("category", true) as string
		).trim();
		if (!categoryId) {
			await ctx.editOrReply({
				embeds: [createErrorEmbed("The category name can't be empty", true)],
				flags,
			});
			return;
		}

		const linksRaw = ctx.interaction.getInputValue("links", true) as string;
		const links = LinkAdder.parseLinks(linksRaw);
		const linkWord = links.length === 1 ? "link" : "links";

		const [, categoryError] = await t(
			db.insert(schema.categories).values({
				guildId: ctx.guildId,
				categoryId,
			}),
		);
		if (categoryError) {
			ctx.client.logger.error(`Failed to create category: ${categoryError}`);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(`creating category **${categoryId}**`),
				],
				flags,
			});
			return;
		}
		ctx.client.logger.info(`Created new category: ${categoryId}`);

		const linkAdder = new LinkAdder({
			guildId: ctx.guildId,
			categoryId,
			logger: ctx.client.logger,
		});

		const linkAddResult = await linkAdder.add(links);

		if (!linkAddResult.dbSuccess) {
			await ctx.editOrReply({
				embeds: [
					createErrorEmbed(
						`Created new category **${categoryId}**, but an unexpected error occurred while adding the ${linkWord}`,
					),
				],
				flags,
			});
			return;
		}

		const linkResponse = createLinkResponse({
			linkAddResult: linkAddResult,
			categoryId,
			isNewCategory: true,
			prefixMessage: `Created new category **${categoryId}**`,
		});

		switch (linkResponse.type) {
			case LinkResponseType.AllDuplicates: {
				await ctx.editOrReply({
					content: `Created new category **${categoryId}**, but all links are duplicates`,
					flags,
				});
				return;
			}
			case LinkResponseType.AllInvalid: {
				await ctx.editOrReply({
					content: `Created new category **${categoryId}**, but all links are invalid`,
					flags,
				});
				return;
			}
			case LinkResponseType.NoValidLinks: {
				await ctx.editOrReply({
					content: `Created new category **${categoryId}**, but no valid links were provided`,
					flags,
				});
				return;
			}
			case LinkResponseType.Success: {
				await ctx.editOrReply({
					content: linkResponse.content,
					flags,
				});
				return;
			}
		}
	}

	/**
	 * Parses the custom ID of the modal.
	 * @param customId Custom ID to parse.
	 * @param logger Seyfert Logger (from `ctx.client.logger`)
	 * @returns Parsed custom ID options, or `null` if invalid.
	 */
	parseCustomId(
		customId: string,
		logger: Logger,
	): SelectCustomIDOptions | null {
		const [idPrefix, secondPart, ...rest] = customId.split(
			DISCORD_ID_PARTS.separator,
		);

		if (idPrefix !== CATEGORY_SELECT_PARTS.idPrefix) {
			return null;
		}

		if (rest.length > 0) {
			logger.error(`Invalid custom ID (unexpected parts): ${customId}`);
			return null;
		}

		if (secondPart === "ephemeral") {
			return { ephemeral: true };
		}
		if (!secondPart) {
			return { ephemeral: false };
		}

		logger.error(`Invalid custom ID (unknown second part): ${customId}`);
		return null;
	}
}
