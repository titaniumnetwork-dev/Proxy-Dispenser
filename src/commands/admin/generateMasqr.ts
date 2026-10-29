import {
	type CommandContext,
	createStringOption,
	Declare,
	Embed,
	Options,
	SubCommand,
} from "seyfert";
import { t } from "try";
import { applyMasqr } from "@utils/masqr";
import { MessageFlags } from "seyfert/lib/types";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";

const options = {
	query: createStringOption({
		description: "The URL to generate a masqr link for",
		required: true,
	}),
};

@Options(options)
@Declare({
	name: "generate-masqr",
	description: "Generate a Masqr link",
})
export class GenerateMasqrCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		const [masqrOk, masqrErr, masqr] = await t(applyMasqr(ctx.options.query));

		if (!masqrOk || !masqr.ok) {
			ctx.client.logger.error(`Failed to masqr link: ${masqrErr}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("making ")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		return ctx.editOrReply({
			content: `\`${masqr.link}\`\nExpires on ${new Date(masqr.expires).toLocaleString()} Eastern Time`,
		});
	}
}
