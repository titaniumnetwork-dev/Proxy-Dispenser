import { Command, Declare, Options } from "seyfert";
import CheckCommand from "./filters/check";
import ListCommand from "./filters/list";
import SetRoleCommand from "./filters/setRole";

@Declare({
	name: "filters",
	description: "Manage filters",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: 0n,
})
@Options([SetRoleCommand, ListCommand, CheckCommand])
export default class FilterCommand extends Command {}
