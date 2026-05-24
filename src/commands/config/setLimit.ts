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
		description:
			"Default per-category link limit (used when a category has no explicit limit)",
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
	description:
		"Set the default per-category link limit for this server",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
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

		const [ok, error] = await t(
			db
				.update(schema.guild)
				.set({ monthlyLimit: limit })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (!ok) {
			ctx.client.logger.error(`Failed to set monthly limit: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting the monthly limit")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Default per-category link limit set to **${limit}**. Categories with their own \`/category set-limit\` keep that value.`,
			flags,
		});
	}
}
