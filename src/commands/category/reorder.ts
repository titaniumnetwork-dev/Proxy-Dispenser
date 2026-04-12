import { db, schema } from "@db";
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { and, asc, eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createIntegerOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	category: createStringOption({
		description: "The category to move",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	position: createIntegerOption({
		description: "The target position (1 is first)",
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
	name: "reorder",
	description: "Reorder categories for panel display",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ReorderCategoryCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const categoryId = ctx.options.category as string;

		const [, categoriesError, categories] = await t(
			db.query.categories.findMany({
				where: (categories, { eq }) => eq(categories.guildId, guildId),
				columns: { categoryId: true, sortOrder: true },
				orderBy: (categories) => [
					asc(categories.sortOrder),
					asc(categories.categoryId),
				],
			}),
		);
		if (categoriesError) {
			ctx.client.logger.error(
				`Failed to fetch categories for reorder: ${categoriesError}`,
			);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("reordering categories")],
				flags,
			});
			return;
		}

		if (!categories || categories.length === 0) {
			await ctx.editOrReply({
				content: "No categories found.",
				flags,
			});
			return;
		}

		const currentIndex = categories.findIndex(
			(category) => category.categoryId === categoryId,
		);
		if (currentIndex === -1) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** not found.`,
				flags,
			});
			return;
		}

		const targetIndex = Math.min(
			ctx.options.position - 1,
			categories.length - 1,
		);
		if (currentIndex === targetIndex) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** is already at position **${targetIndex + 1}**.`,
				flags,
			});
			return;
		}

		const reordered = [...categories];
		const [moved] = reordered.splice(currentIndex, 1);
		if (!moved) {
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("reordering categories")],
				flags,
			});
			return;
		}

		reordered.splice(targetIndex, 0, moved);

		for (const [index, category] of reordered.entries()) {
			if (category.sortOrder === index) {
				continue;
			}

			const [, updateError] = await t(
				db
					.update(schema.categories)
					.set({ sortOrder: index })
					.where(
						and(
							eq(schema.categories.guildId, guildId),
							eq(schema.categories.categoryId, category.categoryId),
						),
					),
			);
			if (updateError) {
				ctx.client.logger.error(
					`Failed to update category order: ${updateError}`,
				);
				await ctx.editOrReply({
					embeds: [createUnexpectedErrorEmbed("reordering categories")],
					flags,
				});
				return;
			}
		}

		await ctx.editOrReply({
			content: `Moved **${categoryId}** to position **${targetIndex + 1}**.`,
			flags,
		});
	}
}
