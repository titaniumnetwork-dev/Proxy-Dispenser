import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { users } from "../db.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("reset-user")
		.setDescription("Reset the monthly link count for a user.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addUserOption((option) =>
			option
				.setName("user")
				.setDescription("The user to reset.")
				.setRequired(true)
		),
        async execute(interaction) {
        const userOption = interaction.options.getUser("user");

        const user = await users.get(userOption.id);

		if (user) {
			await users.set(userOption.id, {
				used: 0,
			});
		}

		await interaction.reply({
			content: `Reset proxy limit for <@${userOption.id}>`,
		});
        }
};
