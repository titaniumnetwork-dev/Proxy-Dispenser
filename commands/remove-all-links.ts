import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { links } from "../db.ts";
import config from "../config.json" with {type: "json"};

const { services }: Config = config;

const servicesChoices = services.map((service) => {
  return {
    name: service.name,
    value: service.name,
  };
});

export default {
  data: new SlashCommandBuilder()
    .setName("remove-all-links")
    .setDescription("Removes every link link for a service in the database.")
    .addStringOption((option) =>
      option
        .setName("service")
        .setDescription("The service to remove all links for.")
        .setRequired(true)
        .setChoices(servicesChoices)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const service = interaction.options.getString("service");
    const allLinks = (await links.get(service)) || [];

    await links.set(service, []);

    if (allLinks.length === 0) {
      return await interaction.reply({
        content: `${service} has no links in the database.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `Removed ${String(allLinks.length)} link${
        allLinks.length === 1 ? "" : "s"
      } from ${service}.`,
      ephemeral: true,
    });
  },
};
