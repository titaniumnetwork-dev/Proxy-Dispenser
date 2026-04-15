import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createChannelOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { ChannelType, MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	channel: createChannelOption({
		description:
			"The channel to log link reports to (leave empty to disable)",
		required: false,
		channel_types: [ChannelType.GuildText],
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-report-channel",
	description: "Set the channel for dispenser reports",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetReportChannelCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}
		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const channelId = ctx.options.channel?.id ?? null;

		const [ok, error] = await t(
			db
				.update(schema.guild)
				.set({ logChannelBlockedLinkReports: channelId })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (!ok) {
			ctx.client.logger.error(`Failed to set report channel: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting the report channel")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (!channelId) {
			await ctx.editOrReply({
				content: "Report channel has been disabled.",
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Report channel set to <#${channelId}>.`,
			flags,
		});
	}
}
