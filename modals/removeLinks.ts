import { links } from "../db.ts";

export default {
	name: "removeLinks",
	async execute(interaction) {
		const serviceName = interaction.customId.split(this.name + "/")[1];
		const urlInput = interaction.fields.getTextInputValue("urlsInput");
		const allLinks = (await links.get(serviceName)) || [];

		const notIncludedURLs = [];
		const invalidURLs = [];
		let urls = urlInput.split(/[\n, ]+/).map((url) => url.trim());

		for (let url in urls) {
			try {
				new URL(urls[url]);

				if (!allLinks.includes(urls[url])) {
					notIncludedURLs.push(urls[url]);
					delete urls[url];
				}
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

		await links.set(
			serviceName,
			allLinks.filter((url) => !urls.includes(url))
		);

		await interaction.reply({
			content: `Removed ${String(urls.length)} link${
				urls.length === 1 ? "s" : ""
			} from ${serviceName}.`,
			ephemeral: true,
		});

		const invalidLinks = invalidURLs.map((url) => "- " + url).join("\n");
        const notIncludedLinks = notIncludedURLs.map((url) => "- " + url).join("\n");

		if (invalidURLs.length > 0) {
			await interaction.followUp({
				content: `Some links were not removed due to being invalid: \n${invalidLinks}`,
				ephemeral: true,
			});
		}
		if (notIncludedURLs.length > 0) {
			await interaction.followUp({
				content: `Some links were not added due to not existing in the ${serviceName} database: \n${notIncludedLinks}`,
				ephemeral: true,
			});
		}
	},
};
