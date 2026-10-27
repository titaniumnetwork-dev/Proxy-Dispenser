import { checkLink } from "@utils/filterCheck";
import { formatFilterFields } from "@utils/filterDisplay";
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

		const description = `Results for \`${ctx.options.query}\``;
		const fields: { name: string; value: string; inline?: boolean }[] = [
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
			...formatFilterFields(check.unblocked, "Unblocked", {
				statusEmoji: "✅",
				categories: check.categories,
			}),
			...formatFilterFields(check.blocked, "Blocked", {
				statusEmoji: "❌",
				categories: check.categories,
			}),
			...formatFilterFields(check.unknown, "Unknown", {
				statusEmoji: "❓",
				categories: check.categories,
			}),
		];

		const groups: (typeof fields)[] = [];
		let group: typeof fields = [];
		let used = "Filter Check".length + description.length;
		for (const field of fields) {
			const fieldChars = field.name.length + field.value.length;
			if (
				group.length > 0 &&
				(group.length >= 25 || used + fieldChars > 6000)
			) {
				groups.push(group);
				group = [];
				used = "Filter Check (continued)".length;
			}
			group.push(field);
			used += fieldChars;
		}
		if (group.length > 0) {
			groups.push(group);
		}

		const embeds = groups.map((group, index) => {
			const embed = new Embed().setColor("#5865F2");
			if (index > 0) {
				embed.setTitle("Filter Check (continued)");
			} else {
				embed.setTitle("Filter Check").setDescription(description);
			}
			return embed.addFields(...group).setTimestamp();
		});

		await ctx.editResponse({
			embeds,
		});
	}
}
