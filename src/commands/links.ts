/**
 * @fileoverview A slash command to manage links for a server's panel
 */

import { Command, Declare, Options } from "seyfert";
import AddCommand from "./links/add";
import AddFormCommand from "./links/batchAdd";
import ListCommand from "./links/list";
import RemoveCommand from "./links/remove";
import RemoveAllCommand from "./links/removeAll";

@Declare({
	name: "links",
	description: "Manage links for your server's panel (link admins only)",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
	defaultMemberPermissions: 0n,
})
@Options([
	AddCommand,
	AddFormCommand,
	RemoveCommand,
	RemoveAllCommand,
	ListCommand,
])
export default class LinksCommand extends Command {}
