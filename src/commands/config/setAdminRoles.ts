import { db, schema } from "@db";
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
	role: createRoleOption({
		description: "The role to add or remove as an admin role",
		required: true,
	}),
	action: createStringOption({
		description: "Whether to add or remove the role",
		required: true,
		choices: [
			{ name: "Add", value: "add" },
			{ name: "Remove", value: "remove" },
		],
	}),
	ephemeral: createBooleanOption({
		description: "Whether or not only you can see this",
		required: false,
	}),
};

@Declare({
	name: "set-admin-roles",
	description: "Add or remove an admin role for the bot",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class SetAdminRolesCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const role = ctx.options.role;
		const action = ctx.options.action as "add" | "remove";

		const [, fetchError, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
				columns: { adminRoleIds: true },
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

		const adminRoleIds = [...(guildRow?.adminRoleIds ?? [])];

		if (action === "add") {
			if (adminRoleIds.includes(role.id)) {
				await ctx.editOrReply({
					content: `<@&${role.id}> is already an admin role.`,
					flags,
				});
				return;
			}
			adminRoleIds.push(role.id);
		} else {
			const index = adminRoleIds.indexOf(role.id);
			if (index === -1) {
				await ctx.editOrReply({
					content: `<@&${role.id}> is not an admin role.`,
					flags,
				});
				return;
			}
			adminRoleIds.splice(index, 1);
		}

		const [, error] = await t(
			db
				.update(schema.guild)
				.set({ adminRoleIds })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to update admin roles: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("editing admin roles")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `<@&${role.id}> has been ${action}${action === "add" ? "e" : ""}d as an admin role.`,
			flags,
		});
	}
}
