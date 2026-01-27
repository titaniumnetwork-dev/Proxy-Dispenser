import { type CommandContext, Declare, Options, SubCommand, createStringOption } from "seyfert";

const options = {
	host: createStringOption({
		description: "The host to remove",
		required: true
	})
};

@Declare({
	name: "remove",
	description: "Remove a BYOD host",
	integrationTypes: ['GuildInstall', 'UserInstall'],
	contexts: ['Guild', 'BotDM', 'PrivateChannel']
})
@Options(options)
export class RemoveCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		try {
			if (ctx.guildId) await ctx.deferReply();
			const host = ctx.options.host;

			const response = await fetch(`http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts/${host}`, {
				method: 'DELETE',
				headers: {
					'x-api-key': process.env.API_KEY || 'your-api-key-here',
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to remove host: ${response.statusText}`);
			}

			await ctx.editOrReply({
				content: `Successfully removed host: ${host}`
			});

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : '';
			await ctx.editOrReply({
				content: `Error removing host. ${errorMessage}`
			});
		}
	}
}