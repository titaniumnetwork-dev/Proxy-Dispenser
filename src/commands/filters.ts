import { Command, Declare, Options } from "seyfert";
import ListCommand from "./filters/list";
import SetRoleCommand from "./filters/setRole";

@Declare({
	name: "filters",
	description: "Manage filters",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options([SetRoleCommand, ListCommand])
export default class FilterCommand extends Command {}
