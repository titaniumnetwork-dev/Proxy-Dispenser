import { ComponentCommand, type ComponentContext, Modal } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import {
	default as BatchAddFormLinksModal,
	createLinksLabel,
	createSelectCustomID,
} from "@/components/batch-add-form-links-modal";
import { createUnexpectedErrorEmbed } from "@/utils/info-embeds";

export default class AddFormCategorySelect extends ComponentCommand {
	componentType = "StringSelect" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return (
			BatchAddFormLinksModal.parseCustomId(ctx.customId, ctx.client.logger) !==
			null
		);
	}

	override async run(ctx: ComponentContext<typeof this.componentType>) {
		const categoryId = ctx.interaction.values[0] ?? "";
		const parsedCustomId = BatchAddFormLinksModal.parseCustomId(
			ctx.customId,
			ctx.client.logger,
		);
		if (!parsedCustomId) {
			ctx.client.logger.error(`Invalid custom ID: ${ctx.customId}`);
			await ctx.interaction.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(`getting the category for this modal`),
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const linksLabel = createLinksLabel();

		const modal = new Modal()
			.setCustomId(
				createSelectCustomID({
					categoryId,
					ephemeral: parsedCustomId.ephemeral,
				}),
			)
			.setTitle(`${categoryId} | Add Links`)
			.setComponents([linksLabel]);

		await ctx.interaction.modal(modal);
	}
}
