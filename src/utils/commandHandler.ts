import type { CommandContext } from "seyfert";
import type { Command, SubCommand } from "seyfert/lib/commands";
import { HandleCommand } from "seyfert/lib/commands/handle";
import type { PermissionsBitField } from "seyfert/lib/structures/extra/Permissions";

export class PermissionsHandleCommand extends HandleCommand {
	override checkMemberPermissions(
		command: Command | SubCommand,
		context: CommandContext,
		permissions: PermissionsBitField
	) {
		if (context.interaction) return;
		return super.checkMemberPermissions(command, context, permissions);
	}
}
