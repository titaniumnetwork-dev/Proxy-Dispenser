import { Command, Declare, Options } from "seyfert";
import { ListCommand } from "./byod/list";
import { SearchCommand } from "./byod/search";
import { UnsetCommand } from "./byod/unset";

@Declare({
	name: "byod",
	description: "Manage BYOD (link admins only)",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: 0n,
})
@Options([ListCommand, UnsetCommand, SearchCommand])
export default class BYODCommand extends Command {}
