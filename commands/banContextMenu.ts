import {
  PermissionFlagsBits,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
} from "discord.js";
import { bans } from "../db.ts";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Ban")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const banned = (await bans.get(interaction.targetUser.id)) || false;

    if (banned) {
      return await interaction.reply({
        content: `<@${interaction.targetUser.id}> is already banned.`,
        ephemeral: true,
      });
    }

    await bans.set(interaction.targetUser.id, true);

    await interaction.reply({
      content: `<@${interaction.targetUser.id}> was banned from using the bot.`,
      ephemeral: true,
    });
  },
};
