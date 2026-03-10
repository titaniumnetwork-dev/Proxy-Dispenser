import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
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
		description: "The user to blacklist",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "blacklist",
	description: "Blacklist a user from using the bot",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class BlacklistCommand extends SubCommand {
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

		if (user?.isBlacklisted) {
			await ctx.editOrReply({
				content: `<@${userId}> is already blacklisted.`,
				flags,
			});
			return;
		}

		const [, error] = await t(
			db
				.insert(schema.guildUsers)
				.values({
					guildId,
					userId,
					isBlacklisted: 1,
				})
				.onConflictDoUpdate({
					target: [schema.guildUsers.guildId, schema.guildUsers.userId],
					set: { isBlacklisted: 1 },
				}),
		);
		if (error) {
			ctx.client.logger.error(`Failed to blacklist user: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`blacklisting <@${userId}>`)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `<@${userId}> was blacklisted from using the bot.`,
			flags,
		});
	}
}
