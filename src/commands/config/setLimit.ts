import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createIntegerOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	limit: createIntegerOption({
		description: "The maximum number of links a user can request per month",
		required: true,
		min_value: 1,
		max_value: 100,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-limit",
	description: "Set the monthly link limit for all users",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class SetLimitCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const limit = ctx.options.limit;

		const [, error] = await t(
			db
				.update(schema.guild)
				.set({ monthlyLimit: limit })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to set monthly limit: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting the monthly limit")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Monthly limit set to **${limit}**.`,
			flags,
		});
	}
}
