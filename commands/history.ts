import { type ColorResolvable, SlashCommandBuilder, ButtonStyle } from "discord.js";
import { Pagination } from "pagination.djs";
import { requested } from "../db.ts";
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
		.setName("history")
		.setDescription("View previously requested links.")
		.addStringOption((option) =>
			option
				.setName("service")
				.setDescription("The service to get links for.")
				.setRequired(true)
				.setChoices(servicesChoices)
		),
	async execute(interaction) {
        const service = interaction.options.getString("service");
        let userRequested = await requested.get(interaction.user.id);

        if (userRequested) {
            if (!userRequested[service]) {
                userRequested = await requested.set(interaction.user.id, {
                    ...userRequested,
                    [service]: []
                })
            }
        } else {
            userRequested = await requested.set(interaction.user.id, {
                [service]: []
            })
        }

        if (!userRequested[service].length) {
            return await interaction.reply({
                content: "You haven't requested any proxies of this service yet.",
                ephemeral: true,
            })
        }

        const serviceLinks = userRequested[service].map((link) => "- " + link);

		const pagination = new Pagination(interaction, {
			limit: 10,
			ephemeral: true,
		});

		pagination.setTitle(service + " | History");
		pagination.setDescriptions(serviceLinks);
		pagination.setColor(config.theme as ColorResolvable);
        delete pagination.buttons.first;
        delete pagination.buttons.last;
		pagination.render();
	},
};
