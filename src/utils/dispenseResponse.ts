import { dispense } from "@utils/dispenser";
import { getUnblocked } from "@utils/filterCheck";
import { ActionRow, Button, type ComponentContext, Embed } from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";

export async function handleDispense(
	ctx: ComponentContext,
	categoryId: string,
): Promise<void> {
	if (!ctx.guildId) {
		await ctx.write({
			content: "This can only be used in a server.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const result = await dispense({
		guildId: ctx.guildId,
		categoryId,
		userId: ctx.author.id,
		member: ctx.member,
		logger: ctx.client.logger,
		client: ctx.client,
	});

	if (!result.success) {
		await ctx.editOrReply({
			content: result.error,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const unblocked = await getUnblocked(result.link);

	const embed = new Embed()
		.setColor("#5865F2")
		.setTitle("Proxy Delivery")
		.setDescription("Enjoy your brand new proxy link!")
		.addFields(
			{ name: "Type", value: categoryId, inline: true },
			{ name: "Link", value: result.link, inline: false },
			{ name: "Unblocked On", value: unblocked.join(", "), inline: false },
			{ name: "Remaining", value: String(result.remaining), inline: true },
		);

	const row = new ActionRow<Button>();
	const openButton = new Button()
		.setLabel("Open")
		.setStyle(ButtonStyle.Link)
		.setURL(result.link);
	row.addComponents(openButton);

	if (result.remaining > 0 && result.hasMore) {
		const requestAnother = new Button()
			.setLabel("Request Another")
			.setStyle(ButtonStyle.Secondary)
			.setCustomId(`dispense:${categoryId}`);
		row.addComponents(requestAnother);
	}

	const reportButton = new Button()
		.setCustomId(`report:${categoryId}:${result.link}`)
		.setStyle(ButtonStyle.Danger)
		.setLabel("Report");
	row.addComponents(reportButton);

	await ctx.editOrReply({
		embeds: [embed],
		components: [row],
		flags: MessageFlags.Ephemeral,
	});
}
