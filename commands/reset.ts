import { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits } from "discord.js";

export default {
	data: new ContextMenuCommandBuilder()
		.setName("Reset")
		.setType(ApplicationCommandType.User)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		await interaction.reply({
			content: `Reset proxy limit for <@${interaction.targetUser.id}>`,
		});
	},
};
