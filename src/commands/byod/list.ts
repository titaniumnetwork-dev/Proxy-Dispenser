/**
 * @fileoverview A slash command to list all BYOD hosts.
 */

import ResetUserCommand from "@commands/admin/resetUser";
import { DISCORD_EMBED_DESCRIPTION_LIMIT } from "@consts";
import { EmbedPaginator } from "@utils/embedPaginator";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	AttachmentBuilder,
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Embed,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

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
export class ListCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? true;
		await ctx.deferReply(ephemeral);
		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;

		const [ok, error, response] = await t(
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
		if (!ok) {
			ctx.client.logger.error(`Failed to fetch hosts: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching hosts")],
				flags,
			});
			return;
		}

		const [hostsOk, hostsErr, hostsResp] = await t(
			response.json() as Promise<
				Array<{
					service: string;
					hostname: string;
				}>
			>,
		);
		if (!hostsOk) {
			ctx.client.logger.error(`Failed to parse hosts response: ${hostsErr}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("parsing hosts response")],
				flags,
			});
			return;
		}

		let hosts = hostsResp;
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
					return;
				}

				const jsonCodeBlockEmbed = byodBaseEmbed.setDescription(codeBlock);
				await ctx.editOrReply({
					embeds: [jsonCodeBlockEmbed],
					flags,
				});
				return;
			}
		}

		const items = 10;
		const totalPages = Math.ceil(hosts.length / items);

		const baseTitle = serviceFilter
			? `BYOD Hosts - ${serviceFilter}`
			: "BYOD Hosts";

		const embeds: Embed[] = [];
		for (let page = 0; page < totalPages; page++) {
			const start = page * items;
			const slicedHosts = hosts.slice(start, start + items);

			const pageEmbed = new Embed()
				.setTitle(baseTitle)
				.setColor("#5865F2")
				.setFooter({
					text: `Page ${page + 1} of ${totalPages}`,
				});

			for (const host of slicedHosts) {
				pageEmbed.addFields({
					name: host.service,
					value: `<https://${host.hostname}>`,
					inline: false,
				});
			}

			embeds.push(pageEmbed);
		}

		const paginator = new EmbedPaginator(ctx, embeds, ephemeral);
		await paginator.start();
	}
}
