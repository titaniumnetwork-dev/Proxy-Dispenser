import { db, schema } from "@db";
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { and, eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	createIntegerOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	category: createStringOption({
		description: "The category to set the channel for",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	channel: createStringOption({
		description: "The channel to set (leave empty to remove)",
		required: false,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "channel",
	description: "Set or update the channel for a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ChannelCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const categoryId = ctx.options.category;
		const channelId = ctx.options.channel;

		const [resultOk, resultErr, result] = await t(
			db
				.update(schema.categories)
				.set({ channelId })
				.where(
					and(
						eq(schema.categories.guildId, ctx.guildId),
						eq(schema.categories.categoryId, categoryId),
					),
				)
				.returning({ categoryId: schema.categories.categoryId }),
		);
		if (!resultOk) {
			ctx.client.logger.error(`Failed to set channel for category: ${resultErr}`);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`setting channel for category **${categoryId}**`,
					),
				],
				flags,
			});
			return;
		}

		if (result.length === 0) {
			await ctx.editOrReply({
				content: `Category **${categoryId}** not found`,
				flags,
			});
			return;
		}

		if (channelId) {
			await ctx.editOrReply({
				content: `Set channel for category **${categoryId}** to ${channelId}`,
				flags,
			});
			return;
		}

		await ctx.editOrReply({
			content: `Removed channel from category **${categoryId}**`,
			flags,
		});
	}
}
