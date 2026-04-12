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
	mode: createStringOption({
		description: "The monthly cycle",
		required: true,
		choices: [
			{
				name: "First of the Month", // wake up! its the
				value: "first",
			},
			{
				name: "Relative to the User",
				value: "relative",
			},
		],
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-cycle",
	description: "Set the monthly cycle mode",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetCycleCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const mode = ctx.options.mode as "first" | "relative";

		const [ok, error] = await t(
			db
				.update(schema.guild)
				.set({ monthlyCycle: mode })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (!ok) {
			ctx.client.logger.error(`Failed to set monthly cycle: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting the monthly cycle mode")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Monthly cycle mode is **${mode === "first" ? "reset on the first of the month" : "relative to the user"}**.`,
			flags,
		});
	}
}
