import {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";

export default {
	name: "report",
	async execute(interaction) {
		const modal = new ModalBuilder().setCustomId("report").setTitle("Report");

		const reasonInput = new TextInputBuilder()
			.setCustomId("reasonInput")
			.setLabel("Reason")
			.setStyle(TextInputStyle.Paragraph);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			reasonInput
		);

		modal.addComponents(row);

		await interaction.showModal(modal);
	},
};
