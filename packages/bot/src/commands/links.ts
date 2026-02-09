import { Command, Declare, Options } from "seyfert";
import AddCommand from "./links/add";
import AddFormCommand from "./links/batch-add";
import ListCommand from "./links/list";
import RemoveCommand from "./links/remove";
import RenameCategoryCommand from "./links/rename-category";

@Declare({
	name: "links",
	description: "Manage links for your server's panel",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options([
	AddCommand,
	AddFormCommand,
	RemoveCommand,
	RenameCategoryCommand,
	ListCommand,
])
export default class LinksCommand extends Command {}
