import { db } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	ActionRow,
	Button,
	Command,
	type CommandContext,
	createBooleanOption,
	Declare,
	Options,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};
@Options(options)
@Declare({
	name: "docs",
	description: "Get the docs link for this server",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
export default class DocsCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const guildId = ctx.guildId;

		const [, error, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
				columns: { docsUrl: true },
			}),
		);
		if (error || !guildRow) {
			ctx.client.logger.error(`Failed to fetch docs URL: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching docs URL")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!guildRow.docsUrl) {
			await ctx.editOrReply({
				content: "No docs URL has been configured.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const row = new ActionRow<Button>();
		const button = new Button()
			.setLabel("Docs")
			.setStyle(ButtonStyle.Link)
			.setURL(guildRow.docsUrl);
		row.addComponents(button);

		await ctx.editOrReply({
			content: "Docs:",
			components: [row],
		});
	}
}
