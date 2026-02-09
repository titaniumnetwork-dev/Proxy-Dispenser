/**
 * @fileoverview A slash command to remove a BYOD host.
 */

import {
	type CommandContext,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { t } from "try";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/info-embeds";

const options = {
	host: createStringOption({
		description: "The BYOD host to unset",
		required: true,
	}),
};

@Declare({
	name: "unset",
	description: "Unset a BYOD host",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
@Options(options)
export class UnsetCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		// We need to yield some time for fetching from the BYOD API
		await ctx.deferReply();

		const host = ctx.options.host;

		const [, error, response] = await t(
			fetch(
				`http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts/${host}`,
				{
					method: "DELETE",
					headers: {
						"x-api-key": process.env.API_KEY || "your-api-key-here",
						"Content-Type": "application/json",
					},
				},
			),
		);

		if (error || !response) {
			ctx.client.logger.error(`Failed to unset BYOD host: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("unset BYOD host")],
			});
			return;
		}

		await ctx.editOrReply({
			content: `Unset BYOD host: ${host}`,
		});
	}
}
