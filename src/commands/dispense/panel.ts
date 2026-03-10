import { db } from "@db";
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import {
	ActionRow,
	Button,
	type CommandContext,
	createStringOption,
	Declare,
	Embed,
	Options,
	SubCommand,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	category: createStringOption({
		description: "Only show a specific category on the panel (Optional)",
		required: false,
		autocomplete: categoryAutocomplete,
	}),
};

@Declare({
	name: "panel",
	description: "Display the proxy dispenser panel",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class PanelCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const guildId = ctx.guildId;
		const categoryFilter = ctx.options.category as string | undefined;

		const [, error, categories] = await t(
			db.query.categories.findMany({
				where: (categories, { eq, and }) =>
					categoryFilter
						? and(
								eq(categories.guildId, guildId),
								eq(categories.categoryId, categoryFilter),
							)
						: eq(categories.guildId, guildId),
				columns: { categoryId: true, emojiId: true },
			}),
		);
		if (error) {
			ctx.client.logger.error(`Failed to fetch categories: ${error}`);
		}
		if (!categories) {
			ctx.client.logger.error(
				`Categories query returned an unexpected null result`,
			);
		}
		if (error || !categories) {
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching categories")],
			});
			return;
		}

		if (categories.length === 0) {
			await ctx.editOrReply({
				content: "No categories found.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Proxy Dispenser")
			.setDescription(
				"Choose a proxy below to receive a new link! Use /history to view previously requested links.",
			);

		const rows: ActionRow<Button>[] = [];
		for (let n = 0; n < categories.length; n += 5) {
			const batch = categories.slice(n, n + 5);
			const row = new ActionRow<Button>();
			const buttons: Button[] = [];

			for (const category of batch) {
				const button = new Button()
					.setCustomId(`dispense:${category.categoryId}`)
					.setLabel(category.categoryId)
					.setStyle(ButtonStyle.Secondary);
				if (category.emojiId) {
					button.setEmoji(category.emojiId);
				}
				buttons.push(button);
			}

			row.setComponents(buttons);
			rows.push(row);
		}

		await ctx.editOrReply({
			embeds: [embed],
			components: rows,
		});
	}
}
