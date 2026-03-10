/**
 * @fileoverview A slash command to list all BYOD hosts.
 */

import { DISCORD_EMBED_DESCRIPTION_LIMIT } from "@consts";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	ActionRow,
	AttachmentBuilder,
	Button,
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Embed,
	Options,
	type WebhookMessage,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";
import { BYODSubCommand } from "../../utils/byodAuth";

const options = {
	service: createStringOption({
		description: "Filter by service name",
		required: false,
		autocomplete: async (interaction) => {
			try {
				const response = await fetch(
					`http://${process.env.BYOD_API_IP}:${process.env.BYOD_API_PORT || 3000}/hosts`,
					{
						method: "GET",
						headers: {
							"x-api-key": process.env.BYOD_API_KEY || "your-api-key-here",
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
	format: createStringOption({
		description: "Optionally, display the list as a JSON export",
		required: false,
		choices: [
			{ name: "JSON Embed", value: "JSON_EMBED" },
			{ name: "JSON Dump", value: "JSON_DUMP" },
		],
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
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
	override async execute(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? true;
		await ctx.deferReply(ephemeral);
		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;

		const [, error, response] = await t(
			fetch(
				`http://${process.env.BYOD_API_IP}:${process.env.BYOD_API_PORT || 3000}/hosts`,
				{
					method: "GET",
					headers: {
						"x-api-key": process.env.BYOD_API_KEY || "your-api-key-here",
						"Content-Type": "application/json",
					},
				},
			),
		);
		if (error) {
			ctx.client.logger.error(`Failed to fetch hosts: ${error}`);
		}
		if (!response) {
			ctx.client.logger.error(`Hosts API returned a null response`);
		}
		if (error || !response) {
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching hosts")],
				flags,
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
				flags,
			});
			return;
		}

		const format = ctx.options.format;
		const data = JSON.stringify(hosts, null, 2);

		const byodBaseEmbed = new Embed()
			.setTitle(serviceFilter ? `BYOD Hosts - ${serviceFilter}` : "BYOD Hosts")
			.setColor("#5865F2"); // blurple

		const byodHostsJsonFileAttachment = new AttachmentBuilder()
			.setName("byod-hosts.json")
			.setFile("buffer", Buffer.from(data));

		switch (format) {
			case "JSON_DUMP": {
				const jsonDumpEmbed = byodBaseEmbed.setDescription(
					"Attached the JSON export of BYOD hosts as a file",
				);

				await ctx.editOrReply({
					files: [byodHostsJsonFileAttachment],
					embeds: [jsonDumpEmbed],
					flags,
				});
				return;
			}
			case "JSON_EMBED": {
				const codeBlock = `\`\`\`json\n${data}\n\`\`\``;

				if (codeBlock.length > DISCORD_EMBED_DESCRIPTION_LIMIT) {
					const jsonCodeBlockEmbed = byodBaseEmbed.setDescription(
						"The output is too large for a codeblock\nAttached the JSON export of BYOD hosts as a file",
					);

					await ctx.editOrReply({
						embeds: [jsonCodeBlockEmbed],
						files: [byodHostsJsonFileAttachment],
						flags,
					});
				} else {
					const jsonCodeBlockEmbed = byodBaseEmbed.setDescription(codeBlock);

					await ctx.editOrReply({
						embeds: [jsonCodeBlockEmbed],
						flags,
					});
				}
				return;
			}
		}

		const items = 10;
		const totalPages = Math.ceil(hosts.length / items);
		let currentPage = 0;

		const createEmbed = (page: number) => {
			const start = page * items;
			const end = start + items;
			const slicedHosts = hosts.slice(start, end);

			const pageEmbed = byodBaseEmbed.setFooter({
				text: `Page ${page + 1} of ${totalPages}`,
			});

			slicedHosts.forEach((host) => {
				pageEmbed.addFields({
					name: host.service,
					value: `<https://${host.hostname}>`,
					inline: false,
				});
			});

			return pageEmbed;
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
			embeds: [createEmbed(currentPage)],
			components: [row],
			flags,
		})) as WebhookMessage;

		const collector = message.createComponentCollector();

		collector.run("byod:next", async (i) => {
			if (i.isButton()) {
				currentPage++;

				backBtn.setDisabled(currentPage === 0);
				nextBtn.setDisabled(currentPage === totalPages - 1);

				return i.update({
					embeds: [createEmbed(currentPage)],
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
					embeds: [createEmbed(currentPage)],
					components: [
						new ActionRow<Button>().setComponents([backBtn, nextBtn]),
					],
				});
			}
		});
	}
}
