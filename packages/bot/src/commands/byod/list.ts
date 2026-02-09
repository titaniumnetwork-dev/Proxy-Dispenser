/**
 * @fileoverview A slash command to list all BYOD hosts.
 */

import { type CommandContext, Declare, SubCommand } from "seyfert";
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

		const data = JSON.stringify(await response.json(), null, 2);

		await ctx.editOrReply({
			content: `\`\`\`json\n${data}\n\`\`\``,
		});
	}
}
