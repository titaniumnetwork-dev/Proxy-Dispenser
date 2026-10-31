/**
 * @fileoverview A slash command to show latency with Discord.
 */

import { Command, Declare, Options } from "seyfert";
import CheckAllCommand from "./check/all";
import CheckBulkCommand from "./check/bulk";
@Declare({
	name: "check",
	description: "Check user provided links",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
	defaultMemberPermissions: ["SendMessages"],
})
@Options([CheckAllCommand, CheckBulkCommand])
export default class CheckCommand extends Command {}
