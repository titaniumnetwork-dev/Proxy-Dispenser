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

		const [, error] = await t(
			originalMessage.edit({
				embeds: [closedEmbed],
				components: [],
			}),
		);
		if (error) {
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
