import { db } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	type CommandContext,
	createBooleanOption,
	Declare,
	Embed,
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
	name: "view",
	description: "View the current guild configuration",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ViewCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;

		const [, error, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
			}),
		);
		if (error || !guildRow) {
			ctx.client.logger.error(`Failed to fetch guild config: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching guild configuration")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const premiumLimits = guildRow.premiumLimits ?? {};
		const premiumLines = Object.entries(premiumLimits).map(
			([roleId, limit]) => `<@&${roleId}>: **${limit}**`,
		);
		const premiumLimitDisplay =
			premiumLines.length > 0 ? premiumLines.join("\n") : "None";

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Guild Configuration")
			.addFields(
				{
					name: "Monthly Limit",
					value: String(guildRow.monthlyLimit),
					inline: true,
				},
				{
					name: "Monthly Cycle",
					value: guildRow.monthlyCycle,
					inline: true,
				},
				{
					name: "Dispense Mode",
					value: guildRow.dispenseMode,
					inline: true,
				},
				{
					name: "Log Channel",
					value: guildRow.logChannelId
						? `<#${guildRow.logChannelId}>`
						: "Not set",
					inline: true,
				},
				{
					name: "Reports Channel",
					value: guildRow.logChannelBlockedLinkReports
						? `<#${guildRow.logChannelBlockedLinkReports}>`
						: "Not set",
					inline: true,
				},
				{
					name: "Docs URL",
					value: guildRow.docsUrl ?? "Not set",
					inline: true,
				},
				{
					name: "Bonus Role Limits",
					value: premiumLimitDisplay,
					inline: false,
				},
				{
					name: "Auto Dispense",
					value: guildRow.automaticDispense ? "Enabled" : "Disabled",
					inline: true,
				},
			);

		await ctx.editOrReply({
			embeds: [embed],
			flags,
		});
	}
}
