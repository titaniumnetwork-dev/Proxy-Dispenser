import { filters } from "@../config.json";

export function getFilterName(filterId: string): string {
	const entry = filters[filterId as keyof typeof filters];
	return entry?.[0] ?? filterId;
}

export function getFilterEmoji(filterId: string): string | undefined {
	const entry = filters[filterId as keyof typeof filters];
	return entry?.[1];
}

export function displayFilter(filterId: string, category?: string): string {
	const name = getFilterName(filterId);
	const emoji = getFilterEmoji(filterId);
	const base = emoji ? `${emoji} ${name}` : name;
	return category ? `${base} (${category})` : base;
}

export function formatFilterList(
	filterIds: readonly string[],
	options: {
		statusEmoji?: string;
		categories?: Readonly<Record<string, string>>;
		emptyText?: string;
		maxLines?: number;
	} = {},
): string {
	const {
		statusEmoji,
		categories,
		emptyText = "None",
		maxLines = 25,
	} = options;

	const uniqueNames = [
		...new Set(
			filterIds.map((filterId) => {
				const display = displayFilter(filterId, categories?.[filterId]);
				return statusEmoji ? `${display} ${statusEmoji}` : display;
			}),
		),
	];

	if (uniqueNames.length === 0) {
		return emptyText;
	}

	return uniqueNames
		.slice(0, maxLines)
		.map((name) => `- ${name}`)
		.join("\n");
}
