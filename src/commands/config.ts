import SetAdminRolesCommand from "@commands/config/set-admin-roles";
import SetAdminUsersCommand from "@commands/config/set-admin-users";
import SetBonusCommand from "@commands/config/set-bonus";
import SetCycleCommand from "@commands/config/set-cycle";
import SetDocsCommand from "@commands/config/set-docs";
import SetLimitCommand from "@commands/config/set-limit";
import SetLogChannelCommand from "@commands/config/set-log-channel";
import ViewCommand from "@commands/config/view";
import { Command, Declare, Options } from "seyfert";

@Declare({
	name: "config",
	description: "Configure guild settings",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options([
	ViewCommand,
	SetLimitCommand,
	SetBonusCommand,
	SetLogChannelCommand,
	SetAdminRolesCommand,
	SetAdminUsersCommand,
	SetCycleCommand,
	SetDocsCommand,
])
export default class ConfigCommand extends Command {}
