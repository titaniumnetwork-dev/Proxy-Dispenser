import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ColorResolvable, EmbedBuilder } from "discord.js";
import config from "../config.json" with {type: "json"};

export default {
	name: "report",
	async execute(interaction) {
		const service = interaction.message.embeds[0].data.fields[0].value;
		const link = interaction.message.embeds[0].data.fields[1].value;
		const reason = interaction.fields.getTextInputValue("reasonInput");

		const embed = new EmbedBuilder()
			.setColor(config.theme as ColorResolvable)
			.setTitle("Proxy Report")
			.setDescription("A user has reported an issue with a link.")
			.addFields(
				{ name: "Type", value: service },
				{ name: "Link", value: link },
                { name: "Reason", value: reason },
				{ name: "User", value: `<@${interaction.user.id}>` }
			);
		const row = new ActionRowBuilder();

		const closeReport = new ButtonBuilder()
			.setCustomId("closeReport")
			.setStyle(ButtonStyle.Danger)
			.setLabel("Close Report");

		row.addComponents(closeReport);

		interaction.client.channels.cache.get(config.reportsID).send({
			embeds: [embed],
			components: [row],
			ephemeral: true,
		});

        await interaction.reply({
            content: "Report sent!",
            ephemeral: true,
        })
	},
};
