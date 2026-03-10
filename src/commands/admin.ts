import BlacklistCommand from "@commands/admin/blacklist";
import ResetCommand from "@commands/admin/reset";
import ResetUserCommand from "@commands/admin/resetUser";
import UnblacklistCommand from "@commands/admin/unblacklist";
import { Command, Declare, Options } from "seyfert";

@Declare({
	name: "admin",
	description: "Moderation and user management",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options([BlacklistCommand, UnblacklistCommand, ResetCommand, ResetUserCommand])
export default class AdminCommand extends Command {}
