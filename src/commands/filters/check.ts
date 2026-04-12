import { checkLink } from "@utils/filterCheck";
import {
	type CommandContext,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { t } from "try";

const options = {
	query: createStringOption({
		description: "The URL to query",
		required: true,
	}),
};

@Options(options)
@Declare({
	name: "check",
	description: "Check a URL against the filter checker",
})
export default class CheckCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		if (!ctx.options.query) {
			await ctx.write({
				content: "Please provide a URL to query.",
			});
			return;
		}
		await ctx.write({
			content: "```Fetching...```",
		});
		const [checkOk, checkError, check] = await t(checkLink(ctx.options.query));
		if (!checkOk) {
			await ctx.editResponse({
				content: `\`\`\`Failed to check the URL against the filter checker.
				Error: ${checkError}\`\`\``,
			});
			return;
		}
		let message: string = `\`\`\`json\n{\n`;
		message += `\turl: ${ctx.options.query}${check.blocked.length > 0 || check.unblocked.length > 0 || check.unknown.length > 0 ? ",\n" : "\n"}`;
		if (check.blocked.length > 0) {
			message += `\tblocked: [\n\t\t${check.blocked.join(",\n\t\t")}\n\t]${check.unblocked.length > 0 || check.unknown.length > 0 ? ",\n" : "\n"}`;
		}
		if (check.unblocked.length > 0) {
			message += `\tunblocked: [\n\t\t${check.unblocked.join(",\n\t\t")}\n\t]${check.unknown.length > 0 ? ",\n" : "\n"}`;
		}
		if (check.unknown.length > 0) {
			message += `\tunknown: [\n\t\t${check.unknown.join(",\n\t\t")}\n\t]\n`;
		}
		message += `}\n\`\`\``;
		await ctx.editResponse({
			content: message,
		});
	}
}
