import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	url: createStringOption({
		description: "The docs URL (set as empty to clear)",
		required: false,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-docs",
	description: "Set the docs URL for /docs",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetDocsCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const url = (ctx.options.url as string | undefined) ?? null;

		if (url) {
			try {
				new URL(url);
			} catch {
				await ctx.editOrReply({
					content: "Invalid URL.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		const [, error] = await t(
			db
				.update(schema.guild)
				.set({ docsUrl: url })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to set docs URL: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting the docs URL")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (url) {
			await ctx.editOrReply({
				content: `Docs URL set to ${url}`,
				flags,
			});
		} else {
			await ctx.editOrReply({
				content: "Docs URL has been cleared.",
				flags,
			});
		}
	}
}
