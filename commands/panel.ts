import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits,
	EmbedBuilder,
	type ColorResolvable,
} from "discord.js";
import config from "../config.json" with {type: "json"};

const { services }: Config = config;

export default {
	data: new SlashCommandBuilder()
		.setName("panel")
		.setDescription("Generates the proxy panel.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const channel = interaction.channel;
		const everyoneRole = channel.guild.roles.everyone;
		const permissions = channel.permissionsFor(everyoneRole);
		const canSendMessages = permissions.has(PermissionFlagsBits.SendMessages);

		const embed = new EmbedBuilder()
			.setColor(config.theme as ColorResolvable)
			.setTitle("Proxy Dispenser")
			.setDescription(
				`Choose a proxy below to revieve a new link! Use </history:${interaction.client.historyCommandID}> to view previously requested links.`
			);

		const rows: Array<ActionRowBuilder> = [];

		for (let n = 0; n < services.length; n += 5) {
			const fiveServices = services.slice(n, n + 5);

			const row = new ActionRowBuilder();

			const buttons: Array<ButtonBuilder> = [];

			for (let service of fiveServices) {
				const newButton = new ButtonBuilder()
					.setCustomId("dispense/" + service.name)
					.setLabel(service.name)
					.setStyle(ButtonStyle.Secondary);
				if (service.emoji) {
					newButton.setEmoji(service.emoji);
				}

				buttons.push(newButton);
			}

			row.setComponents(buttons);

			rows.push(row);
		}

		await interaction.reply({
			embeds: [embed],
			components: rows,
		});

		if (canSendMessages) {
			const removeSendMessages = new ButtonBuilder()
				.setCustomId("removeSendMessagesPermission")
				.setLabel("Remove Permission")
				.setStyle(ButtonStyle.Danger);

			const row = new ActionRowBuilder().addComponents(removeSendMessages);

			await interaction.followUp({
				content:
					"Everyone in this channel has the Send Messages permission. Would you like to remove this permission?",
				components: [row],
				ephemeral: true,
			});
		}
	},
};
