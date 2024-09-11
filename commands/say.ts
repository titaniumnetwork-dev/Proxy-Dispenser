import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export default {
	data: new SlashCommandBuilder()
		.setName("say")
		.setDescription("Say anything through the bot.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption((option) =>
			option
				.setName("text")
				.setDescription("The text to say.")
				.setRequired(true)
		),
	async execute(interaction) {
		const text = interaction.options.getString("text");

		await interaction.reply({
			content: text,
		});
	},
};
