export default {
  name: "removeSendMessagesPermission",
  async execute(interaction) {
    const channel = interaction.channel;
    try {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        SendMessages: false,
      });

      await interaction.update({
        content: `Send Messages permission removed for everyone in <#${channel.id}>`,
        components: [],
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content: "Cannot update permissions.",
        ephemeral: true,
      });
    }
  },
};
