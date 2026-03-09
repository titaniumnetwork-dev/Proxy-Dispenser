/**
 * @fileoverview A command containing various subcommands to manage BYOD hosts.
 * @param {string[]} allowedRoleIds - An allowlist for roles who are authorized to manage BYOD.
 * @param {string[]} allowedUserIds - An allowlist for users who are authorized to manage BYOD.
 * @param {string[]} disallowedUserIds - An explicit blacklist for users who are not authorized to manage BYOD. Overrides allowedUserIds and allowedRoleIds.
 */

import { type CommandContext, SubCommand } from "seyfert";
import { createErrorEmbed } from "@/utils/infoEmbeds";
import config from "../../config.json";

export abstract class BYODSubCommand extends SubCommand {
	async run(ctx: CommandContext) {
		const userId = ctx.author.id;
		const member = ctx.member;

		const allowedUserIds: string[] = config.byod.allowedUserIds || [];
		const disallowedUserIds: string[] = config.byod.disallowedUserIds || [];
		const allowedRoleIds: string[] = config.byod.allowedRoleIds || [];

		if (disallowedUserIds.includes(userId)) {
			await ctx.editOrReply({
				embeds: [
					createErrorEmbed("You are not authorized to manage BYOD hosts."),
				],
			});
			return;
		}

		if (allowedUserIds.includes(userId)) {
			await this.execute(ctx);
			return;
		}

		if (member && allowedRoleIds.length > 0) {
			const memberRoles = member.roles.keys;
			const hasRole = memberRoles.some((roleId: string) =>
				allowedRoleIds.includes(roleId),
			);
			if (hasRole) {
				await this.execute(ctx);
				return;
			}
		}

		await ctx.editOrReply({
			embeds: [
				createErrorEmbed("You are not authorized to manage BYOD hosts."),
			],
		});
	}

	protected abstract execute(ctx: CommandContext): Promise<void>;
}
