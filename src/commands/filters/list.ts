import { db } from "@db";
import { filterOptions } from "@utils/autocomplete";
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
	name: "list",
	description: "List filter role mappings",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class ListFiltersCommand extends SubCommand {
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
				columns: { filterRoleIds: true },
			}),
		);

		if (error) {
			ctx.client.logger.error(`Failed to list filter role mappings: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("listing filter role mappings")],
				flags,
			});
			return;
		}

		const filterRoleIds = guildRow?.filterRoleIds ?? {};
		const lines = filterOptions.map((filter) => {
			const roleId = filterRoleIds[filter.value];
			return `**${filter.name}** (\`${filter.value}\`): ${roleId ? `<@&${roleId}>` : "None"}`;
		});

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Filter Role Mappings")
			.setDescription(lines.join("\n"));

		await ctx.editOrReply({
			embeds: [embed],
			flags,
		});
	}
}
