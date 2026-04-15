import {
	ComponentCommand,
	type ComponentContext,
	Label,
	Modal,
	StringSelectMenu,
	StringSelectOption,
	TextInput,
} from "seyfert";
import { MessageFlags, TextInputStyle } from "seyfert/lib/types";

const reportPrefix = "report:";

export default class ReportButton extends ComponentCommand {
	componentType = "Button" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return ctx.customId.startsWith(reportPrefix);
	}

	async run(ctx: ComponentContext<typeof this.componentType>) {
		const [, categoryId, ...linkParts] = ctx.customId.split(":");
		const link = linkParts.join(":");
		if (!categoryId) {
			await ctx.interaction.write({
				content: "Invalid report button.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const reasonInput = new TextInput()
			.setCustomId("reason")
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder("Describe the issue")
			.setRequired(true)
			.setLength({ max: 1000 });

		const typeInput = new StringSelectMenu()
			.setCustomId("type")
			.setPlaceholder("Select what issue you are having")
			.setRequired(true)
			.addOption(new StringSelectOption().setLabel("Blocked"))
			.addOption(new StringSelectOption().setLabel("Broken"))
			.addOption(new StringSelectOption().setLabel("Other"));

		const reasonLabel = new Label()
			.setLabel(
				"Describe your problem (Like what filter it's blocked on, if applicable)",
			)
			.setComponent(reasonInput);

		const typeLabel = new Label()
			.setLabel("What's wrong with this link?")
			.setComponent(typeInput);

		const modal = new Modal()
			.setCustomId(`report-modal:${categoryId}:${link}`)
			.setTitle("Report Link")
			.setComponents([typeLabel, reasonLabel]);

		await ctx.interaction.modal(modal);
	}
}
