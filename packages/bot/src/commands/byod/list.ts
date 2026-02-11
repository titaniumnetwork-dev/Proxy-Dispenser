/**
 * @fileoverview A slash command to list all BYOD hosts.
 */
import {
	ActionRow,
	Button,
	type CommandContext,
	Declare,
	SubCommand,
	Embed,
	WebhookMessage,
} from "seyfert";
import { ButtonStyle } from "seyfert/lib/types";
import { t } from "try";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/info-embeds";

@Declare({
	name: "list",
	description: "List all BYOD hosts",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
export class ListCommand extends SubCommand {
	async run(ctx: CommandContext) {
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

		const hosts = (await response.json()) as Array<{
			service: string;
			hostname: string;
		}>;
		const items = 10;
		const totalPages = Math.ceil(hosts.length / items);
		let currentPage = 0;

		const embed = (page: number) => {
			const start = page * items;
			const end = start + items;
			const slicedHosts = hosts.slice(start, end);

			const embed = new Embed()
				.setTitle("BYOD Hosts")
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

		const message = await ctx.editOrReply({
			embeds: [embed(currentPage)],
			components: [row],
		}) as WebhookMessage;

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
