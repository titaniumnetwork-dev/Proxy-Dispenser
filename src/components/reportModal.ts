import { db } from "@db";
import { createUnexpectedErrorEmbed } from "@utils/infoEmbeds";
import {
	ActionRow,
	Button,
	Embed,
	ModalCommand,
	type ModalContext,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const reportPrefix = "report-modal:";

export default class ReportModal extends ModalCommand {
	override filter(ctx: ModalContext) {
		return ctx.customId.startsWith(reportPrefix);
	}

	override onRunError(ctx: ModalContext, error: unknown) {
		ctx.client.logger.error("ReportModal.run error:", error);
		return ctx.editOrReply({
			embeds: [createUnexpectedErrorEmbed("processing your report")],
			flags: MessageFlags.Ephemeral,
		});
	}

	async run(ctx: ModalContext) {
		if (!ctx.guildId) {
			await ctx.editOrReply({
				content: "This can only be used in a server.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const [, categoryId, ...linkParts] = ctx.customId.split(":");
		const link = linkParts.join(":");

		if (!categoryId || !link) {
			ctx.client.logger.error(
				`Invalid custom ID for report modal: ${ctx.customId}`,
			);
			await ctx.editOrReply({
				content: "Invalid report details.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		let reason: string;
		try {
			reason = ctx.interaction.getInputValue("reason", true) as string;
		} catch (error) {
			ctx.client.logger.error(
				`Failed to get input value "reason" from modal. Components: ${JSON.stringify(ctx.components)}`,
				error,
			);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("reading your report details")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const userId = ctx.author.id;
		const guildId = ctx.guildId;

		const [fetchOk, fetchError, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
				columns: {
					reportsChannelId: true,
					logChannelBlockedLinkReports: true,
					logChannelId: true,
				},
			}),
		);
		if (!fetchOk || !guildRow) {
			ctx.client.logger.error(
				`Failed to fetch guild for report: ${fetchError}`,
			);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("submitting your report")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const targetChannelId =
			guildRow.reportsChannelId ??
			guildRow.logChannelBlockedLinkReports ??
			guildRow.logChannelId;

		if (!targetChannelId) {
			await ctx.editOrReply({
				content:
					"No reports channel has been configured. Please ask an administrator to set one up.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const reportEmbed = new Embed()
			.setColor("#ED4245")
			.setTitle("Link Report")
			.addFields(
				{ name: "Category", value: categoryId, inline: true },
				{ name: "Link", value: link, inline: true },
				{ name: "Reporter", value: `<@${userId}>`, inline: true },
				{ name: "Reason", value: reason, inline: false },
			)
			.setTimestamp();

		const row = new ActionRow<Button>();
		const closeButton = new Button()
			.setCustomId(`report-close:${userId}:${categoryId}:${link}`)
			.setLabel("Close Report")
			.setStyle(ButtonStyle.Secondary);
		const restoreButton = new Button()
			.setCustomId(`report-restore:${userId}:${categoryId}:${link}`)
			.setLabel("Restore User Link & Remove Link from Database")
			.setStyle(ButtonStyle.Danger);
		row.addComponents(closeButton, restoreButton);

		const [sendOk, sendError] = await t(
			ctx.client.messages.write(targetChannelId, {
				embeds: [reportEmbed],
				components: [row],
			}),
		);
		if (!sendOk) {
			ctx.client.logger.error(`Failed to send report: ${sendError}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("sending your report")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: "Your report has been submitted.",
			flags: MessageFlags.Ephemeral,
		});
	}
}
