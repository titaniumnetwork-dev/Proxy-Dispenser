/**
 * @fileoverview A slash command to show latency with Discord.
 */

import { Command, type CommandContext, Declare } from "seyfert";

@Declare({
	name: "ping",
	aliases: ["pong", "latency"],
	description: "Show latency with Discord",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
	defaultMemberPermissions: 0n,
})
export default class PingCommand extends Command {
	override async run(ctx: CommandContext) {
		const ping = ctx.client.gateway.latency;
		await ctx.write({
			content: `Pong!\n\nLatency: \`${ping}ms\``,
		});
	}
}
