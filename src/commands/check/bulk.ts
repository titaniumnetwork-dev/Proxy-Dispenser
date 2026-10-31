import { checkLinks } from "@utils/filterCheck";
import { getFilterName } from "@utils/filterDisplay";
import {
	AttachmentBuilder,
	type CommandContext,
	createStringOption,
	Declare,
	Options,
	SubCommand,
} from "seyfert";
import { t } from "try";

const parsedMaxLinks = Number.parseInt(process.env.MAX_BULK_LINKS ?? "", 10);
const MAX_LINKS =
	Number.isNaN(parsedMaxLinks) || parsedMaxLinks < 1 ? 5 : parsedMaxLinks;

const options = {
	links: createStringOption({
		description: `${MAX_LINKS} or less URLs, separated by spaces`,
		required: true,
	}),
};

function csvField(value: string): string {
	return `"${value.replaceAll('"', '""')}"`;
}

@Options(options)
@Declare({
	name: "bulk",
	description: `Check up to ${MAX_LINKS} URLs against all filters and export the results as a CSV`,
})
export default class CheckBulkCommand extends SubCommand {
	override async run(ctx: CommandContext<typeof options>) {
		const links = [
			...new Set(
				ctx.options.links
					.split(/\s+/)
					.map((link) => link.trim())
					.filter(Boolean),
			),
		];

		if (links.length === 0) {
			await ctx.write({
				content: "Please provide at least one URL to query.",
			});
			return;
		}

		if (links.length > MAX_LINKS) {
			await ctx.write({
				content: `Please provide at most ${MAX_LINKS} URLs.`,
			});
			return;
		}

		await ctx.deferReply();

		const [checksOk, checksError, checks] = await t(checkLinks(links));
		if (!checksOk || !checks) {
			ctx.client.logger.error(`Failed to bulk check links: ${checksError}`);
			await ctx.editResponse({
				content: "Failed to check the URLs against the filter checker.",
			});
			return;
		}

		const rows = [
			["Link", "Unblocked on", "Blocked on", "Total"],
			...links.map((link) => {
				const check = checks.get(link);
				const blocked = check?.blocked ?? [];
				const unblocked = check?.unblocked ?? [];
				const unknown = check?.unknown ?? [];
				return [
					link,
					unblocked.length > 0
						? unblocked.map(getFilterName).join(", ")
						: "None",
					blocked.length > 0 ? blocked.map(getFilterName).join(", ") : "None",
					String(blocked.length + unblocked.length + unknown.length),
				];
			}),
		];

		const csv = rows.map((row) => row.map(csvField).join(",")).join("\n");

		const attachment = new AttachmentBuilder()
			.setName("filter-check.csv")
			.setFile("buffer", Buffer.from(csv));

		await ctx.editResponse({
			content: `Filter check results for ${links.length} link${
				links.length === 1 ? "" : "s"
			}.`,
			files: [attachment],
		});
	}
}
