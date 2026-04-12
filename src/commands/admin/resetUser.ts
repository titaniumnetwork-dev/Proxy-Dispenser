import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { and, eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createUserOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	user: createUserOption({
		description: "The user to reset",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "reset-user",
	description: "Reset the monthly link count for a user",
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

		await ctx.deferReply(ctx.options.ephemeral ?? false);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const userId = ctx.options.user.id;

		const [resetOk, resetErr] = await t(
			db
				.update(schema.guildUsers)
				.set({
					timesUserCycle: 0,
					timesMonthlyCycle: 0,
				})
				.where(
					and(
						eq(schema.guildUsers.guildId, guildId),
						eq(schema.guildUsers.userId, userId),
					),
				),
		);
		if (!resetOk) {
			ctx.client.logger.error(`Failed to reset user: ${resetErr}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`resetting <@${userId}>`)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Reset proxy limit for <@${userId}>`,
			flags,
		});
	}
}
