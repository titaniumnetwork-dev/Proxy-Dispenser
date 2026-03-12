import { DISCORD_ID_SEPARATOR } from "@consts";
import {
	createLinkResponse,
	LinkResponseType,
} from "@utils/createAddLinkResponse";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { LinkAdder } from "@utils/linkAdder";
import { Label, ModalCommand, type ModalContext, TextInput } from "seyfert";
import { MessageFlags, TextInputStyle } from "seyfert/lib/types";

export const CATEGORY_SELECT_PREFIX = "add-form-category";

const CATEGORY_SELECT_CUSTOM_ID = `${CATEGORY_SELECT_PREFIX}${DISCORD_ID_SEPARATOR}`;

interface SelectCustomIDOptions {
	categoryId: string;
	ephemeral: boolean;
}

export function createSelectCustomID({
	categoryId,
	ephemeral,
}: SelectCustomIDOptions) {
	return `${CATEGORY_SELECT_CUSTOM_ID}${categoryId}${DISCORD_ID_SEPARATOR}${ephemeral ? "true" : "false"}${DISCORD_ID_SEPARATOR}`;
}

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

export default class AddLinksModal extends ModalCommand {
	override filter(ctx: ModalContext) {
		return ctx.customId.startsWith(CATEGORY_SELECT_PREFIX);
	}

	async run(ctx: ModalContext) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const parsedCustomId = AddLinksModal.parseCustomId(ctx.customId);
		if (!parsedCustomId) {
			ctx.client.logger.error(`Invalid custom ID: ${ctx.customId}`);
			return ctx.write({
				embeds: [
					createUnexpectedErrorEmbed(`getting the category for this modal`),
				],
				flags: MessageFlags.Ephemeral,
			});
		}

		const categoryId = parsedCustomId.categoryId;
		const ephemeral = parsedCustomId.ephemeral === "true";

		if (!categoryId) {
			ctx.client.logger.error(
				`No category ID found in custom ID: ${ctx.customId}`,
			);
			return;
		}

		const linksRaw = ctx.interaction.getInputValue("links", true) as string;
		const links = LinkAdder.parseLinks(linksRaw);

		await ctx.deferReply(ephemeral);

		const linkAdder = new LinkAdder({
			guildId: ctx.guildId,
			categoryId,
			logger: ctx.client.logger,
		});

		const linkAddResult = await linkAdder.add(links);

		if (!linkAddResult.dbSuccess) {
			return ctx.editOrReply({
				content:
					linkAddResult.dbError ??
					`Failed to add links to category **${categoryId}**`,
				flags: MessageFlags.Ephemeral,
			});
		}

		const listResponse = createLinkResponse({
			linkAddResult,
			categoryId,
			ephemeral,
		});

		switch (listResponse.type) {
			case LinkResponseType.AllDuplicates: {
				await ctx.editOrReply({
					content: "All links are duplicates",
					flags: listResponse.ephemeral ? MessageFlags.Ephemeral : undefined,
				});
				return;
			}
			case LinkResponseType.AllInvalid: {
				await ctx.editOrReply({
					content: "All links are invalid",
					flags: listResponse.ephemeral ? MessageFlags.Ephemeral : undefined,
				});
				return;
			}
			case LinkResponseType.NoValidLinks: {
				await ctx.editOrReply({
					content:
						"No valid links provided. Please enter at least one valid URL.",
					flags: listResponse.ephemeral ? MessageFlags.Ephemeral : undefined,
				});
				return;
			}
			case LinkResponseType.Success: {
				await ctx.editOrReply({
					content: listResponse.content,
					flags: listResponse.ephemeral ? MessageFlags.Ephemeral : undefined,
				});
				return;
			}
		}
	}

	public static parseCustomId(customId: string) {
		const [, categoryId, ephemeral] = customId.split(":");
		return { categoryId, ephemeral };
	}
}
