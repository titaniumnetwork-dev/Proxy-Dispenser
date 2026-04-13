import { dispense } from "@utils/dispenser";
import { getUnblocked } from "@utils/filterCheck";
import { ActionRow, Button, type ComponentContext, Embed } from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";

export async function handleDispense(
	ctx: ComponentContext,
	categoryId: string,
	responseType: "editOrReply" | "write" | "followup" = "editOrReply",
): Promise<void> {
	const respond = (() => {
		switch (responseType) {
			case "write":
				return ctx.write.bind(ctx);
			case "followup":
				return ctx.followup.bind(ctx);
			default:
				return ctx.editOrReply.bind(ctx);
		}
	})();

	if (!ctx.guildId) {
		await respond({
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
		await respond({
			content: result.error,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const unblocked = result.priorityEnabled
		? await getUnblocked(result.sourceLink)
		: [];

	const embed = new Embed()
		.setColor("#5865F2")
		.setTitle("Proxy Delivery")
		.setDescription(
			result.filterFallback
				? "No links matched your filter preferences. Here's a random link instead."
				: "Enjoy your brand new proxy link!",
		)
		.addFields(
			{ name: "Type", value: categoryId, inline: true },
			{ name: "Link", value: `\`${result.link}\``, inline: false },
			{
				name: "Unblocked On",
				value: unblocked.length > 0 ? unblocked.join(", ") : "Unknown",
				inline: false,
			},
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

	const reportCustomId = `report:${categoryId}:${result.sourceLink}`;
	const reportButton = new Button()
		.setCustomId(reportCustomId.slice(0, 100))
		.setStyle(ButtonStyle.Danger)
		.setLabel("Report");
	row.addComponents(reportButton);

	await respond({
		embeds: [embed],
		components: [row],
		flags: MessageFlags.Ephemeral,
	});
}
