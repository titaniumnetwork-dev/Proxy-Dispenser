import BlacklistCommand from "@commands/admin/blacklist";
import ResetCommand from "@commands/admin/reset";
import ResetUserCommand from "@commands/admin/resetUser";
import UnblacklistCommand from "@commands/admin/unblacklist";
import { GenerateMasqrCommand } from "@commands/admin/generateMasqr";
import { Command, Declare, Options } from "seyfert";

@Declare({
	name: "admin",
	description: "Moderation and user management",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
  defaultMemberPermissions: ["ManageGuild"],
})
@Options([
	BlacklistCommand,
	UnblacklistCommand,
	ResetCommand,
  ResetUserCommand,
	GenerateMasqrCommand
])
export default class AdminCommand extends Command {}
