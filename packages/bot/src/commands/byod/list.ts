import {type CommandContext, Declare, SubCommand} from 'seyfert';

@Declare({
  name: 'list',
  description: 'List all BYOD hosts',
  integrationTypes: ['GuildInstall', 'UserInstall'],
  contexts: ['Guild', 'BotDM', 'PrivateChannel'],
})
export class ListCommand extends SubCommand {
  async run(ctx: CommandContext) {
    try {
      if (ctx.guildId) await ctx.deferReply();
      const response = await fetch(
        `http://${process.env.API_IP}:${process.env.API_PORT || 3000}/hosts`,
        {
          method: 'GET',
          headers: {
            'x-api-key': process.env.API_KEY || 'your-api-key-here',
            'Content-Type': 'application/json',
          },
        },
      );

      const data = JSON.stringify(await response.json(), null, 2);

      await ctx.editOrReply({
        content: `\`\`\`json\n${data}\n\`\`\``,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      await ctx.editOrReply({
        content: `Error fetching BYOD hosts. ${errorMessage}`,
      });
    }
  }
}
