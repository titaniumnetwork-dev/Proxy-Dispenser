import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { users } from "../db.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("reset")
		.setDescription("Reset the monthly link count for all users.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		await users.clear();

		await interaction.reply({
			content: `The proxy limit has been reset!`,
		});
	},
};
