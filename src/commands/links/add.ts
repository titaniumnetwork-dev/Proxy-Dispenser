/**
 * @fileoverview A slash subcommand to add a link to a guild.
 */
import { categoryAutocomplete } from "@utils/autocomplete";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import {
	createLinkResponse,
	LinkResponseType,
} from "@/utils/createAddLinkResponse";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@/utils/infoEmbeds";
import { LinkAdder } from "@/utils/linkAdder";

const options = {
	link: createStringOption({
		description: "The links to add (may be comma-separated)",
		required: true,
	}),
	category: createStringOption({
		description: "The category to add the links to",
		required: true,
		autocomplete: categoryAutocomplete,
	}),
	ephemeral: createBooleanOption({
		description: "Whether to make the response visible only to you",
		required: false,
	}),
};

@Declare({
	name: "add",
	description: "Add links under a category",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class AddCommand extends SubCommand {
	async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		const ephemeral = ctx.options.ephemeral ?? false;
		const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

		// We need to yield some time for DB operations
		await ctx.deferReply(ephemeral);

		const link = ctx.options.link as string;
		const categoryId = ctx.options.category as string;
		const links = LinkAdder.parseLinks(link);

		// TODO: Warn about duplicates across categories

		const linkAdder = new LinkAdder({
			guildId: ctx.guildId,
			categoryId,
			logger: ctx.client.logger,
		});

		const linkAdderResult = await linkAdder.add(links);
		if (!linkAdderResult.dbSuccess) {
			ctx.client.logger.error(
				`Failed to add links to category ${categoryId}: ${linkAdderResult.dbError}`,
			);
			await ctx.editOrReply({
				embeds: [
					createUnexpectedErrorEmbed(
						`adding links to ${linkAdderResult.newCategory ? "new " : ""}category **${categoryId}**`,
					),
				],
				flags,
			});
			return;
		}

		const linkResponse = createLinkResponse({
			linkAddResult: linkAdderResult,
			categoryId,
		});

		switch (linkResponse.type) {
			case LinkResponseType.Success: {
				await ctx.editOrReply({ content: linkResponse.content, flags });
				break;
			}
			case LinkResponseType.AllDuplicates: {
				await ctx.editOrReply({
					content: `All provided links already exist in category **${categoryId}**`,
					flags,
				});
				break;
			}
			case LinkResponseType.AllInvalid: {
				await ctx.editOrReply({
					content: "All provided links were invalid URLs",
					flags,
				});
				break;
			}
			case LinkResponseType.NoValidLinks: {
				await ctx.editOrReply({
					content:
						"No valid links provided. Please enter at least one valid URL.",
					flags,
				});
				break;
			}
		}
	}
}
