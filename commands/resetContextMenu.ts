import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlagsBits,
} from "discord.js";
import { users } from "../db.ts";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Reset")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const user = await users.get(interaction.targetUser.id);

    if (user) {
      await users.set(interaction.targetUser.id, {
        used: 0,
      });
    }

    await interaction.reply({
      content: `Reset proxy limit for <@${interaction.targetUser.id}>`,
    });
  },
};
