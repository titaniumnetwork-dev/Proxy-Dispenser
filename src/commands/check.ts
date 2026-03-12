import { checkLink } from "@utils/filterCheck";
import {
	Command,
	type CommandContext,
	createStringOption,
	Declare,
	Options,
} from "seyfert";

const options = {
	query: createStringOption({
		description: "The URL to query",
		required: true,
	}),
};

@Options(options)
@Declare({
	name: "check",
	aliases: ["filter", "fcheck"],
	description: "Check a URL against the filter checker",
	integrationTypes: ["GuildInstall", "UserInstall"],
	contexts: ["Guild", "BotDM", "PrivateChannel"],
})
export default class CheckCommand extends Command {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.options.query) {
			await ctx.write({
				content: "Please provide a URL to query.",
			});
			return;
		}
		const check = await checkLink(ctx.options.query);
		await ctx.write({
			content: "```Fetching...```",
		});
		let message: string = `\`\`\`json\n{\n`;
		message += `\turl: ${ctx.options.query}${check.blocked || check.unblocked || check.unknown ? ",\n" : "\n"}`;
		if (check.blocked) {
			message += `\tblocked: [\n\t\t${check.blocked.join(",\n\t\t")}\n\t]${check.unblocked || check.unknown ? ",\n" : "\n"}`;
		}
		if (check.unblocked) {
			message += `\tunblocked: [\n\t\t${check.unblocked.join(",\n\t\t")}\n\t]${check.unknown ? ",\n" : "\n"}`;
		}
		if (check.unknown) {
			message += `\tunknown: [\n\t\t${check.unknown.join(",\n\t\t")}\n\t]\n`;
		}
		message += `}\n\`\`\``;
		await ctx.editResponse({
			content: message,
		});
	}
}
