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
	defaultMemberPermissions: ["SendMessages"],
})
export default class PingCommand extends Command {
	override async run(ctx: CommandContext) {
		//@ts-expect-error for some reason this isnt exposed on the typedef :sob:
		const ping = ctx.client.gateway.latency;
		await ctx.write({
			content: `Pong!\n\nLatency: \`${ping}ms\``,
		});
	}
}
