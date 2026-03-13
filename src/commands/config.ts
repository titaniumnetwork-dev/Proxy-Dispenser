import SetBonusCommand from "@commands/config/setBonus";
import SetCycleCommand from "@commands/config/setCycles";
import SetDocsCommand from "@commands/config/setDocs";
import SetLimitCommand from "@commands/config/setLimit";
import SetLogChannelCommand from "@commands/config/setLogChannel";
import ViewCommand from "@commands/config/view";
import { Command, Declare, Options } from "seyfert";

@Declare({
	name: "config",
	description: "Configure guild settings",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: ["Administrator"],
})
@Options([
	ViewCommand,
	SetLimitCommand,
	SetBonusCommand,
	SetLogChannelCommand,
	SetCycleCommand,
	SetDocsCommand,
])
export default class ConfigCommand extends Command {}
