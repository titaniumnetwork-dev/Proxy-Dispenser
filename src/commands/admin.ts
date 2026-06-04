import BlacklistCommand from "@commands/admin/blacklist";
import ResetCommand from "@commands/admin/reset";
import ResetUserCommand from "@commands/admin/resetUser";
import UnblacklistCommand from "@commands/admin/unblacklist";
import SayCommand from "@commands/admin/say";
import { Command, Declare, Options } from "seyfert";

@Declare({
	name: "admin",
	description: "Moderation and user management",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: 0n,
})
@Options([BlacklistCommand, UnblacklistCommand, ResetCommand, ResetUserCommand, SayCommand])
export default class AdminCommand extends Command {}
