/**
 * @fileoverview A slash command to list all BYOD hosts.
 */
import {
	ActionRow,
	Button,
	type CommandContext,
	createStringOption,
	Declare,
	Embed,
	Options,
	type WebhookMessage,
} from "seyfert";
import { ButtonStyle } from "seyfert/lib/types";
import { t } from "try";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/info-embeds";
import { BYODSubCommand } from "../../utils/byod-auth";

const options = {
	service: createStringOption({
		description: "Filter by service name",
		required: false,
		autocomplete: async (interaction) => {
			try {
				const response = await fetch(
					`http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts`,
					{
						method: "GET",
						headers: {
							"x-api-key": process.env.API_KEY || "your-api-key-here",
							"Content-Type": "application/json",
						},
					},
				);

				if (!response.ok) {
					console.error("Error fetching hosts:", response.statusText);
					return interaction.respond([]);
				}

				const hosts = (await response.json()) as Array<{
					service: string;
					hostname: string;
				}>;

				const services = [...new Set(hosts.map((host) => host.service))];

				const input = interaction.getInput().toLowerCase();
				const filtered = services.filter((service) =>
					service.toLowerCase().includes(input),
				);

				const choices = filtered.slice(0, 25).map((service) => ({
					name: service,
					value: service,
				}));

				return interaction.respond(choices);
			} catch (error) {
				console.error("Error fetching services:", error);
				return interaction.respond([]);
			}
		},
	}),
};

@Declare({
	name: "list",
	description: "List all BYOD hosts",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
@Options(options)
export class ListCommand extends BYODSubCommand {
	async execute(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		// We need to yield some time for fetching from the BYOD API
		await ctx.deferReply();

		const [, error, response] = await t(
			fetch(
				`http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts`,
				{
					method: "GET",
					headers: {
						"x-api-key": process.env.API_KEY || "your-api-key-here",
						"Content-Type": "application/json",
					},
				},
			),
		);

		if (error || !response) {
			ctx.client.logger.error(`Failed to fetch hosts: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching hosts")],
			});
			return;
		}

		let hosts = (await response.json()) as Array<{
			service: string;
			hostname: string;
		}>;

		const serviceFilter = ctx.options.service;
		if (serviceFilter) {
			hosts = hosts.filter((host) => host.service === serviceFilter);
		}

		if (hosts.length === 0) {
			await ctx.editOrReply({
				content: serviceFilter
					? `No hosts found for service: ${serviceFilter}`
					: "No hosts found",
			});
			return;
		}

		const items = 10;
		const totalPages = Math.ceil(hosts.length / items);
		let currentPage = 0;

		const embed = (page: number) => {
			const start = page * items;
			const end = start + items;
			const slicedHosts = hosts.slice(start, end);

			const embed = new Embed()
				.setTitle(
					serviceFilter ? `BYOD Hosts - ${serviceFilter}` : "BYOD Hosts",
				)
				.setColor("#5865F2") // blurple
				.setFooter({ text: `Page ${page + 1} of ${totalPages}` });

			slicedHosts.forEach((host) => {
				embed.addFields({
					name: host.service,
					value: `<https://${host.hostname}>`,
					inline: false,
				});
			});

			return embed;
		};

		const backBtn = new Button()
			.setCustomId("byod:previous")
			.setLabel("Previous")
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		const nextBtn = new Button()
			.setCustomId("byod:next")
			.setLabel("Next")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(totalPages <= 1);

		const row = new ActionRow<Button>().setComponents([backBtn, nextBtn]);

		const message = (await ctx.editOrReply({
			embeds: [embed(currentPage)],
			components: [row],
		})) as WebhookMessage;

		const collector = message.createComponentCollector();

		collector.run("byod:next", async (i) => {
			if (i.isButton()) {
				currentPage++;

				backBtn.setDisabled(currentPage === 0);
				nextBtn.setDisabled(currentPage === totalPages - 1);

				return i.update({
					embeds: [embed(currentPage)],
					components: [
						new ActionRow<Button>().setComponents([backBtn, nextBtn]),
					],
				});
			}
		});

		collector.run("byod:previous", async (i) => {
			if (i.isButton()) {
				currentPage--;

				backBtn.setDisabled(currentPage === 0);
				nextBtn.setDisabled(currentPage === totalPages - 1);

				return i.update({
					embeds: [embed(currentPage)],
					components: [
						new ActionRow<Button>().setComponents([backBtn, nextBtn]),
					],
				});
			}
		});
	}
}
