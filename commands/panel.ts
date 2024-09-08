import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits,
	EmbedBuilder,
} from "discord.js";

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
			.setColor(0x0099ff)
			.setTitle("Proxy Dispenser")
			.setDescription("Choose a proxy below to revieve a new link!");

		const incognito = new ButtonBuilder()
			.setCustomId("Ingonito")
			.setLabel("Incognito")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji("🔥");

		const alu = new ButtonBuilder()
			.setCustomId("Alu")
			.setLabel("Alu")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji("🔥");

		const holyUnblocker = new ButtonBuilder()
			.setCustomId("Holy Unblocker")
			.setLabel("Holy Unblocker")
			.setStyle(ButtonStyle.Secondary)
			.setEmoji("🔥");

		const row = new ActionRowBuilder().addComponents(
			incognito,
			alu,
			holyUnblocker
		);

		await interaction.reply({
			embeds: [embed],
			components: [row],
		});

		if (canSendMessages) {
			const removeSendMessages = new ButtonBuilder()
				.setCustomId("Remove SendMessages Permission")
				.setLabel("Remove Permission")
				.setStyle(ButtonStyle.Danger);

			const row = new ActionRowBuilder().addComponents(removeSendMessages);

			await interaction.followUp({
				content:
					"Everyone in this channel has the SendMessages permission. Would you like to remove this permission?",
				components: [row],
				ephemeral: true,
			});
		}
	},
};
