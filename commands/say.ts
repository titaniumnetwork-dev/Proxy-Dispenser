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
		)
		.addBooleanOption((option) =>
			option.setName("reply").setDescription("Show the message as a reply.")
		),
	async execute(interaction) {
		const reply = interaction.options.getBoolean("reply");
		const text = interaction.options.getString("text");

		if (reply === false) {
			await interaction.reply({
				content: "Sent message.",
				ephemeral: true,
			});

			await interaction.channel.send({
				content: text,
			});
		} else {
			await interaction.reply({
				content: text,
			});
		}
	},
};
