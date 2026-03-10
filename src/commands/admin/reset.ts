import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
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
	name: "reset",
	description: "Reset the monthly link count for all users",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class ResetCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? false);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;

		const [, error] = await t(
			db
				.update(schema.guildUsers)
				.set({
					timesUserCycle: 0,
					timesMonthlyCycle: 0,
				})
				.where(eq(schema.guildUsers.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to reset proxy limit: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("resetting proxy limit")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: "The proxy limit has been reset!",
			flags,
		});
	}
}
