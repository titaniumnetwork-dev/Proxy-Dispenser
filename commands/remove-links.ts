import {
	SlashCommandBuilder,
	PermissionFlagsBits,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import config from "../config.json" with {type: "json"};

const { services }: Config = config;

const servicesChoices = services.map((service) => {
	return {
		name: service.name,
		value: service.name,
	};
});

export default {
	data: new SlashCommandBuilder()
		.setName("remove-links")
		.setDescription("Remove links from the database.")
		.addStringOption((option) =>
			option
				.setName("service")
				.setDescription("The service to remove links for.")
				.setRequired(true)
				.setChoices(servicesChoices)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const service = interaction.options.getString("service");

		const modal = new ModalBuilder()
			.setCustomId("removeLinks/" + service)
			.setTitle(service + " | Remoe Links");

		const urlsInput = new TextInputBuilder()
			.setCustomId("urlsInput")
			.setLabel("Links")
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder("URLs separated by new lines, spaces, or commas.");

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			urlsInput
		);

		modal.addComponents(row);

		await interaction.showModal(modal);
	},
};
