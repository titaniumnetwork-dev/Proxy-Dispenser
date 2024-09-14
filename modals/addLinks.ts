import addLinks from "../commands/add-links.ts";
import { links } from "../db.ts";

export default {
	name: "addLinks",
	async execute(interaction) {
		const serviceName = interaction.customId.split(this.name + "/")[1];
		const urlInput = interaction.fields.getTextInputValue("urlsInput");

		const invalidURLs = [];
		let urls = urlInput.split(/[\n, ]+/).map((url) => url.trim());

		for (let url in urls) {
			try {
				new URL(urls[url]);
			} catch {
				invalidURLs.push(urls[url]);
				delete urls[url];
			}
		}

		urls = urls.filter((url) => url.length > 0);

		if (urls.length < 0) {
			await interaction.reply({
				content: "No links were provided. Please try again.",
				ephemeral: true,
			});
		}

		const allLinks = (await links.get(serviceName)) || [];

		await links.set(serviceName, allLinks.concat(urls));

		await interaction.reply({
			content: `Added ${String(urls.length)} link${
				urls.length === 1 ? "" : "s"
			} to ${serviceName}.`,
			ephemeral: true,
		});

		const invalidLinks = invalidURLs.map((url) => "- " + url).join("\n");

		if (invalidURLs.length > 0) {
			await interaction.followUp({
				content: `Some links were not added due to being invalid: \n${invalidLinks}`,
				ephemeral: true,
			});
		}
	},
};
