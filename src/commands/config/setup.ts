import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	type CommandContext,
	createBooleanOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "setup",
	description: "Setup this guild in the database",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetupConfigCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;

		const [setupOk, setupError, insertedGuild] = await t(
			db
				.insert(schema.guild)
				.values({ guildId })
				.onConflictDoNothing()
				.returning({ guildId: schema.guild.guildId }),
		);
		if (!setupOk) {
			ctx.client.logger.error(`Failed to set up guild: ${setupError}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting up guild")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (insertedGuild && insertedGuild.length > 0) {
			await ctx.editOrReply({
				content: "Guild setup complete.",
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: "Guild is already set up.",
			flags,
		});
	}
}
