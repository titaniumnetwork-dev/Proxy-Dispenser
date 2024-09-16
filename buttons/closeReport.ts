export default {
  name: "closeReport",
  async execute(interaction) {
    interaction.message.delete();
  },
};
