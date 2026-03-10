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
		description: "The user to unblacklist",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "unblacklist",
	description: "Unblacklist a user from using the bot",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class UnblacklistCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? false);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const userId = ctx.options.user.id;

		const [, , user] = await t(
			db.query.guildUsers.findFirst({
				where: (u, { eq, and }) =>
					and(eq(u.guildId, guildId), eq(u.userId, userId)),
				columns: { isBlacklisted: true },
			}),
		);

		if (!user?.isBlacklisted) {
			await ctx.editOrReply({
				content: `<@${userId}> is not blacklisted.`,
				flags,
			});
			return;
		}

		const [, error] = await t(
			db
				.update(schema.guildUsers)
				.set({ isBlacklisted: 0 })
				.where(
					and(
						eq(schema.guildUsers.guildId, guildId),
						eq(schema.guildUsers.userId, userId),
					),
				),
		);
		if (error) {
			ctx.client.logger.error(`Failed to unblacklist user: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`unblacklisting <@${userId}>`)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `<@${userId}> was unblacklisted from using the bot.`,
			flags,
		});
	}
}
