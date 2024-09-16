import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { bans } from "../db.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from using the bot.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to ban.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const banned = (await bans.get(user.id)) || false;

    if (banned) {
      return await interaction.reply({
        content: `<@${user.id}> is already banned.`,
        ephemeral: true,
      });
    }

    await bans.set(user.id, true);

    await interaction.reply({
      content: `<@${user.id}> was banned from using the bot.`,
      ephemeral: true,
    });
  },
};
