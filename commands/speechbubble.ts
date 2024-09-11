import { SlashCommandBuilder } from "discord.js";
import { url } from "inspector";

export default {
	data: new SlashCommandBuilder()
		.setName("speechbubble")
		.setDescription("Adds a speech bubble to an image or gif.")
		.addStringOption((option) =>
			option.setName("url").setDescription("The URL of an image/gif.")
		)
		.addAttachmentOption((option) =>
			option.setName("file").setDescription("Upload am image/gif.")
		),
	async execute(interaction) {
		const url = interaction.options.getString("url");
		const file = interaction.options.getAttachment("file");

		if (!url && !file) {
			return interaction.reply({
				content: "You must provide either a URL or upload a file.",
				ephemeral: true,
			});
		} else if (url && file) {
			return interaction.reply({
				content: "Choose either a URL or upload a file.",
				ephemeral: true,
			});
		}

        let finalURL = "";
        if (file) {
            finalURL = file.url;
        } else {
            finalURL = url;
        }

		await interaction.reply({
			content: "https://titanium-net.work/speechbubble?url=" + finalURL,
		});
	},
};
