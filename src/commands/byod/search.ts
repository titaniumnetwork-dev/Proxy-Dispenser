/**
 * @fileoverview A slash command to search BYOD hosts by hostname.
 */

import { IDLE_TIMEOUT } from "@consts";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	ActionRow,
	Button,
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Embed,
	Options,
	SubCommand,
	type WebhookMessage,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	query: createStringOption({
		description: "Search query for hostname",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "search",
	description: "Search BYOD hosts by hostname",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
@Options(options)
export class SearchCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? true;
		await ctx.deferReply(ephemeral);
		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;

		const query = ctx.options.query.toLowerCase();

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
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching hosts")],
				flags,
			});
			return;
		}
		const [hostsOk, hostsErr, data] = await t(
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

		const hosts = data.filter((host) =>
			host.hostname.toLowerCase().includes(query),
		);

		if (hosts.length === 0) {
			const noResultsEmbed = new Embed()
				.setTitle("No Results Found")
				.setDescription(`No hosts found matching: \`${query}\``)
				.setColor("#FF0000");

			await ctx.editOrReply({
				embeds: [noResultsEmbed],
				flags,
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
				.setTitle("BYOD Hosts Search Results")
				.setDescription(`Found ${hosts.length} host(s) matching: \`${query}\``)
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
			.setCustomId("byod:search:previous")
			.setLabel("Previous")
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true);

		const nextBtn = new Button()
			.setCustomId("byod:search:next")
			.setLabel("Next")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(totalPages <= 1);

		const row = new ActionRow<Button>().setComponents([backBtn, nextBtn]);

		const message = (await ctx.editOrReply({
			embeds: [embed(currentPage)],
			components: [row],
			flags,
		})) as WebhookMessage;

		const collector = message.createComponentCollector({
			filter: (interaction) =>
				interaction.user.id === ctx.author.id && interaction.isButton(),
			idle: IDLE_TIMEOUT,
			onStop: async () => {
				try {
					await message.edit({
						components: [
							new ActionRow<Button>().setComponents([
								backBtn.setDisabled(true),
								nextBtn.setDisabled(true),
							]),
						],
					});
				} catch {}
			},
		});

		collector.run("byod:search:next", async (i) => {
			if (i.isButton()) {
				if (currentPage < totalPages - 1) {
					currentPage++;
				}

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

		collector.run("byod:search:previous", async (i) => {
			if (i.isButton()) {
				if (currentPage > 0) {
					currentPage--;
				}

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
