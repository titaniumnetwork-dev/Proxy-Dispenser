import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import config from "../config.json" with {type: "json"};

export default {
  data: new SlashCommandBuilder()
    .setName("docs")
    .setDescription("Provides the documentation link."),
  async execute(interaction) {
    const docs = new ButtonBuilder()
      .setLabel("Documentation")
      .setURL(config.docsURL)
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(docs);

    await interaction.reply({
      components: [row],
      ephemeral: true,
    });
  },
};
