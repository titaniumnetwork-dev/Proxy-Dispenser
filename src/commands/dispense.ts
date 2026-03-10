import PanelCommand from "@commands/dispense/panel";
import { Command, Declare, Options } from "seyfert";

@Declare({
	name: "dispense",
	description: "Dispense proxy links",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@Options([PanelCommand])
export default class DispenseCommand extends Command {}
