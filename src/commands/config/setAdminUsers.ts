import { db, schema } from "@db";
import {
	createSlashCommandErrorEmbed,
	createUnexpectedErrorEmbed,
} from "@utils/infoEmbeds";
import { eq } from "drizzle-orm";
import {
	type CommandContext,
	createBooleanOption,
	createStringOption,
	createUserOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { t } from "try";

const options = {
	user: createUserOption({
		description: "The user to add or remove as an admin",
		required: true,
	}),
	action: createStringOption({
		description: "Whether to add or remove the user",
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
	name: "set-admin-users",
	description: "Add or remove an admin user for the bot",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options(options)
export default class SetAdminUsersCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.guildId) {
			await createSlashCommandErrorEmbed(ctx);
			return;
		}

		await ctx.deferReply(ctx.options.ephemeral ?? true);

		const flags = ctx.options.ephemeral ? MessageFlags.Ephemeral : undefined;
		const guildId = ctx.guildId;
		const user = ctx.options.user;
		const action = ctx.options.action as "add" | "remove";

		const [, fetchError, guildRow] = await t(
			db.query.guild.findFirst({
				where: (g, { eq }) => eq(g.guildId, guildId),
				columns: { adminUserIds: true },
			}),
		);
		if (fetchError || !guildRow) {
			ctx.client.logger.error(`Failed to fetch guild config: ${fetchError}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("fetching guild configuration")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const adminUserIds = [...(guildRow.adminUserIds ?? [])];

		if (action === "add") {
			if (adminUserIds.includes(user.id)) {
				await ctx.editOrReply({
					content: `<@${user.id}> is already an admin user.`,
					flags,
				});
				return;
			}
			adminUserIds.push(user.id);
		} else {
			const index = adminUserIds.indexOf(user.id);
			if (index === -1) {
				await ctx.editOrReply({
					content: `<@${user.id}> is not an admin user.`,
					flags,
				});
				return;
			}
			adminUserIds.splice(index, 1);
		}

		const [, error] = await t(
			db
				.update(schema.guild)
				.set({ adminUserIds })
				.where(eq(schema.guild.guildId, guildId)),
		);
		if (error) {
			ctx.client.logger.error(`Failed to update admin users: ${error}`);
			await ctx.editOrReply({
				embeds: [createUnexpectedErrorEmbed("editing admin users")],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await ctx.editOrReply({
			content: `<@${user.id}> has been ${action}${action === "add" ? "e" : ""}d as an admin user.`,
			flags,
		});
	}
}
