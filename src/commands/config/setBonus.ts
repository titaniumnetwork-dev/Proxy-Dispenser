import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createIntegerOption,
	createRoleOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	role: createRoleOption({
		description: "The role to set a bonus limit for",
		required: true,
	}),
	limit: createIntegerOption({
		description: "The bonus limit for this role (set to 0 to remove)",
		required: true,
		min_value: 0,
		max_value: 100,
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-bonus",
	description: "Set a bonus link limit for a role",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class SetBonusCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const role = ctx.options.role;
		const limit = ctx.options.limit;

		const [, fetchError, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
				columns: { premiumLimits: true },
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
				ctx.client.logger.error(
					`Failed to create guild config: ${insertError}`,
				);
				await ctx.editOrReply({
					embeds: [createUnexpectedErrorEmbed("fetching guild configuration")],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		const premiumLimits = { ...(guildRow?.premiumLimits ?? {}) };

		if (limit === 0) {
			delete premiumLimits[role.id];
		} else {
			premiumLimits[role.id] = limit;
		}

		const [, error] = await t(
			db
				.update(schema.guild)
				.set({ premiumLimits })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to set bonus limit: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("setting the bonus limit")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (limit === 0) {
			await ctx.editOrReply({
				content: `Removed bonus limit for <@&${role.id}>.`,
				flags,
			});
		} else {
			await ctx.editOrReply({
				content: `Bonus limit for <@&${role.id}> set to **${limit}**.`,
				flags,
			});
		}
	}
}
