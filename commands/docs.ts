import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("docs")
		.setDescription("Provides the documentation link."),
	async execute(interaction) {
		const docs = new ButtonBuilder()
			.setLabel("Titanium Network Docs")
			.setURL("https://docs.titaniumnetwork.org/")
			.setStyle(ButtonStyle.Link);

		const row = new ActionRowBuilder().addComponents(docs);

		await interaction.reply({
			components: [row],
			ephemeral: true,
		});
	},
};
