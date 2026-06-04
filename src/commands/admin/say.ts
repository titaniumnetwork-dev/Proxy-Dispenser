import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
} from "@utils/infoEmbeds";
import {
	type CommandContext,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";

const options = {
	say: createStringOption({
		description: "The message to send",
		required: true,
	}),
};

@Declare({
	name: "say",
	description: "Say a message through the bot",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ResetUserCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.editOrReply({
			content: `Sent.`,
			flags: MessageFlags.Ephemeral,
		});

    await ctx.write({ content: options.say })
	}
}
