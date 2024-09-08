import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import config from "../config.json" with {type: "json"};

export default {
    name: "dispense",
    async execute(interaction) {
        const serviceName = interaction.customId.split(this.name + "/")[1];
        const service = config.services.find(service => service.name === serviceName)

        if (!service) {
            await interaction.reply({
                content: "The requested service ${serviceName} does not exist.",
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle("Proxy Delivery")
            .setDescription("Enjoy your brand new proxy link!")
            .addFields(
                { name: "Type", value: serviceName },
                { name: "Link", value: "https://example.com" },
                { name: "Remaining", value: "2" }
            );

        const link = new ButtonBuilder()
            .setLabel("Open")
            .setStyle(ButtonStyle.Link)
            .setURL("https://example.com");

        const row = new ActionRowBuilder()
        row.addComponents(link);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
        });
    },
};
