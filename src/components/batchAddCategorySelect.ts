import {
	CATEGORY_SELECT_PREFIX,
	createLinksLabel,
	createSelectCustomID,
} from "@components/batchAddFormLinksModal";
import { DISCORD_ID_PARTS } from "@consts";
import { ComponentCommand, type ComponentContext, Modal } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";

const selectPrefix = `${CATEGORY_SELECT_PREFIX}${DISCORD_ID_PARTS.separator}`;

export default class BatchAddCategorySelect extends ComponentCommand {
	componentType = "StringSelect" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return ctx.customId.startsWith(selectPrefix);
	}

	async run(ctx: ComponentContext<typeof this.componentType>) {
		const categoryId = ctx.interaction.values[0];
		if (!categoryId) {
			await ctx.interaction.write({
				content: "No category selected.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const suffix = ctx.customId.slice(selectPrefix.length);
		const ephemeral = suffix === DISCORD_ID_PARTS.ephemeralId;

		const linksLabel = createLinksLabel();

		const modal = new Modal()
			.setCustomId(createSelectCustomID({ categoryId, ephemeral }))
			.setTitle(`${categoryId} | Add Links`)
			.setComponents([linksLabel]);

		await ctx.interaction.modal(modal);
	}
}
