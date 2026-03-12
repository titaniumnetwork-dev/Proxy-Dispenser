import { db, schema } from "@db";
import { filterOptions } from "@utils/autocomplete";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createRoleOption,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	filter: createStringOption({
		description: "The filter to set the role for",
		required: true,
		choices: filterOptions,
	}),
	role: createRoleOption({
		description: "The role to associate with the filter",
		required: true,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-role",
	description: "Set or update the role for a filter",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options(options)
export default class SetRoleCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const filter = ctx.options.filter;
		const role = ctx.options.role;

		const [, fetchError, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
				columns: { filterRoleIds: true },
			}),
		);
		if (fetchError) {
			ctx.client.logger.error(`Failed to fetch guild config: ${fetchError}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching guild configuration")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (!guildRow) {
			const [, insertError] = await t(
				db.insert(schema.guild).values({ guildId }).onConflictDoNothing(),
			);
			if (insertError) {
				ctx.client.logger.error(`Failed to create guild config: ${insertError}`);
				await ctx.editOrReply({
					embeds: [createUnexpectedErrorEmbed("fetching guild configuration")],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		const filterRoleIds = { ...(guildRow?.filterRoleIds ?? {}) };
		if (role) {
			filterRoleIds[filter] = role.id;
		} else {
			delete filterRoleIds[filter];
		}

		const [, error] = await t(
			db
				.update(schema.guild)
				.set({ filterRoleIds })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to set role for filter: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed(`setting role for filter **${filter}**`)],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (role) {
			await ctx.editOrReply({
				content: `Set role for filter **${filter}** to <@&${role.id}>.`,
				flags,
			});
		} else {
			await ctx.editOrReply({
				content: `Removed role mapping for filter **${filter}**.`,
				flags,
			});
		}
	}
}
