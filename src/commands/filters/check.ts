import { checkLink } from "@utils/filterCheck";
import { formatFilterList } from "@utils/filterDisplay";
import {
	type CommandContext,
	createStringOption,
	Declare,
	Embed,
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

		await ctx.deferReply();

		const [checkOk, checkError, check] = await t(checkLink(ctx.options.query));
		if (!checkOk) {
			await ctx.editResponse({
				embeds: [
					new Embed()
						.setColor("#ED4245")
						.setTitle("Filter Check Failed")
						.setDescription(
							"Failed to check the URL against the filter checker.",
						)
						.addFields({
							name: "Error",
							value: `\`${String(checkError)}\``,
						}),
				],
			});
			return;
		}

		const totalFilters =
			check.blocked.length + check.unblocked.length + check.unknown.length;
		const status =
			check.unblocked.length > 0
				? "Partially Unblocked"
				: check.blocked.length > 0 && check.unknown.length === 0
					? "Blocked"
					: check.unknown.length > 0
						? "Unknown"
						: "No Results";

		const embed = new Embed()
			.setColor("#5865F2")
			.setTitle("Filter Check")
			.setDescription(`Results for \`${ctx.options.query}\``)
			.addFields(
				{
					name: "Status",
					value: status,
					inline: true,
				},
				{
					name: "Filters Checked",
					value: String(totalFilters),
					inline: true,
				},
				{
					name: `Blocked (${check.blocked.length})`,
					value: formatFilterList(check.blocked),
					inline: false,
				},
				{
					name: `Unblocked (${check.unblocked.length})`,
					value: formatFilterList(check.unblocked),
					inline: false,
				},
				{
					name: `Unknown (${check.unknown.length})`,
					value: formatFilterList(check.unknown),
					inline: false,
				},
			)
			.setTimestamp();

		await ctx.editResponse({
			embeds: [embed],
		});
	}
}
