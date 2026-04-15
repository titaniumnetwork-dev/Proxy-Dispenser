import {
	ComponentCommand,
	type ComponentContext,
	Label,
	Modal,
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
			.setPlaceholder(
				"Describe the issue. Please specify if the link is broken, blocked (and what filter), or something else.",
			)
			.setRequired(true)
			.setLength({ max: 1000 });

		const reasonLabel = new Label()
			.setLabel("What's wrong with this link?")
			.setComponent(reasonInput);

		const modal = new Modal()
			.setCustomId(`report-modal:${categoryId}:${link}`)
			.setTitle("Report Link")
			.setComponents([reasonLabel]);

		await ctx.interaction.modal(modal);
	}
}
