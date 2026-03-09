/**
 * @fileoverview A slash command to search BYOD hosts by hostname.
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
} from "@/utils/infoEmbeds";
import { BYODSubCommand } from "../../utils/byod-auth";

const options = {
	query: createStringOption({
		description: "Search query for hostname",
		required: true,
	}),
};

@Declare({
	name: "search",
	description: "Search BYOD hosts by hostname",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
@Options(options)
export class SearchCommand extends BYODSubCommand {
	async execute(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const query = ctx.options.query.toLowerCase();

		// We need to yield some time for fetching from the BYOD API
		await ctx.deferReply();

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

		if (error || !response) {
			ctx.client.logger.error(`Failed to fetch hosts: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching hosts")],
			});
			return;
		}

		const all = (await response.json()) as Array<{
			service: string;
			hostname: string;
		}>;

		const hosts = all.filter((host) =>
			host.hostname.toLowerCase().includes(query),
		);

		if (hosts.length === 0) {
			const noResultsEmbed = new Embed()
				.setTitle("No Results Found")
				.setDescription(`No hosts found matching: \`${query}\``)
				.setColor("#FF0000");

			await ctx.editOrReply({
				embeds: [noResultsEmbed],
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
		})) as WebhookMessage;

		const collector = message.createComponentCollector();

		collector.run("byod:search:next", async (i) => {
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

		collector.run("byod:search:previous", async (i) => {
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
