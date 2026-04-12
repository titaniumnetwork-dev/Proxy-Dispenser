import { ComponentCommand, type ComponentContext, Embed } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const closePrefix = "report-close:";

export default class ReportCloseButton extends ComponentCommand {
	componentType = "Button" as const;

	override filter(ctx: ComponentContext<typeof this.componentType>) {
		return ctx.customId.startsWith(closePrefix);
	}

	async run(ctx: ComponentContext<typeof this.componentType>) {
		if (!ctx.guildId) {
			await ctx.interaction.editOrReply({
				content: "This can only be used in a server.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const member = ctx.interaction.member;
		if (!member) {
			await ctx.interaction.editOrReply({
				content: "Error obtaining user permissions.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const hasPermission = member.permissions?.has(["ManageMessages"]);
		if (!hasPermission) {
			await ctx.interaction.editOrReply({
				content:
					"You need the **Manage Messages** permission to close reports.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const originalMessage = ctx.interaction.message;
		if (!originalMessage) {
			await ctx.interaction.editOrReply({
				content: "Could not find the original report message.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const originalEmbed = originalMessage.embeds?.[0];
		const closedEmbed = new Embed()
			.setColor("#2F3136")
			.setTitle("Link Report (Closed)")
			.setDescription(`Closed by <@${ctx.author.id}>`);

		if (originalEmbed) {
			const fields = originalEmbed.fields ?? [];
			for (const field of fields) {
				closedEmbed.addFields({
					name: field.name,
					value: field.value,
					inline: field.inline,
				});
			}
		}

		closedEmbed.setTimestamp();

		const [ok, error] = await t(
			originalMessage.edit({
				embeds: [closedEmbed],
				components: [],
			}),
		);
		if (!ok) {
			ctx.client.logger.error(`Failed to close report: ${error}`);
			await ctx.interaction.editOrReply({
				content: "Failed to close the report.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.interaction.editOrReply({
			content: "Report closed.",
			flags: MessageFlags.Ephemeral,
		});
	}
}
