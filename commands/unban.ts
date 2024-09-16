import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { bans } from "../db.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from using the bot.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unban.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const banned = (await bans.get(user.id)) || false;

    if (!banned) {
      return await interaction.reply({
        content: `<@${user.id}> is not banned.`,
        ephemeral: true,
      });
    }

    await bans.set(user.id, false);

    await interaction.reply({
      content: `<@${user.id}> was unbanned from using the bot.`,
      ephemeral: true,
    });
  },
};
