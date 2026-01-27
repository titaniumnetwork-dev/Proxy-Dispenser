import { Declare, Command, type CommandContext } from 'seyfert';

@Declare({
	name: 'ping',
	description: 'Show latency with Discord',
	integrationTypes: ['GuildInstall', 'UserInstall'],
	contexts: ['Guild', 'BotDM', 'PrivateChannel']
})
export default class PingCommand extends Command {
	override async run(ctx: CommandContext) {
		const ping = ctx.client.gateway.latency;
		await ctx.write({
			content: `Pong!\n\nLatency: \`${ping}ms\``
		});
	}
}