import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type ColorResolvable } from "discord.js";
import config from "../config.json" with {type: "json"};
import { users } from "../db.ts";

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

        let user = await users.get(interaction.user.id);

        if (!user) {
            user = await users.set(interaction.user.id, {
                remaining: 3,
                requested: {}
            })
        }

        if (user.remaining <= 0) {
            return await interaction.reply({
                content: "You have reached your maximum proxy limit for this month!",
                ephemeral: true,
            });
        }

        user = await users.set(interaction.user.id, {
            ...user,
            remaining: user.remaining - 1
        })

        const embed = new EmbedBuilder()
            .setColor(config.theme as ColorResolvable)
            .setTitle("Proxy Delivery")
            .setDescription("Enjoy your brand new proxy link!")
            .addFields(
                { name: "Type", value: serviceName },
                { name: "Link", value: "https://example.com" },
                { name: "Remaining", value: String(user.remaining) }
            );

        const link = new ButtonBuilder()
            .setLabel("Open")
            .setStyle(ButtonStyle.Link)
            .setURL("https://example.com");

        const row = new ActionRowBuilder()
        row.addComponents(link);

        if (config.reportsID) {
            const report = new ButtonBuilder()
                .setCustomId("report")
                .setStyle(ButtonStyle.Danger)
                .setLabel("Report")

            row.addComponents(report);
        }

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
        });
    },
};
