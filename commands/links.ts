import {
	type ColorResolvable,
	SlashCommandBuilder,
	PermissionFlagsBits,
} from "discord.js";
import { Pagination } from "pagination.djs";
import { links } from "../db.ts";
import config from "../config.json" with {type: "json"};

const { services }: Config = config;

const servicesChoices = services.map((service) => {
	return {
		name: service.name,
		value: service.name,
	};
});

export default {
	data: new SlashCommandBuilder()
		.setName("links")
		.setDescription("View all links for a service in the database.")
		.addStringOption((option) =>
			option
				.setName("service")
				.setDescription("The service to get links for.")
				.setRequired(true)
				.setChoices(servicesChoices)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const service = interaction.options.getString("service");
		const allLinks = (await links.get(service)) || [];

		if (!allLinks.length) {
			return await interaction.reply({
				content: service + " has no links.",
				ephemeral: true,
			});
		}

		const serviceLinks = allLinks.map((link) => "- " + link);

		const pagination = new Pagination(interaction, {
			limit: 10,
			ephemeral: true,
		});

		pagination.setTitle(service + " | Links");
		pagination.setDescriptions(serviceLinks);
		pagination.setColor(config.theme as ColorResolvable);
		delete pagination.buttons.first;
		delete pagination.buttons.last;
		pagination.render();
	},
};
