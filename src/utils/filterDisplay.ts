import { filters } from "@../config.json";

export function getFilterName(filterId: string): string {
	const entry = filters[filterId as keyof typeof filters];
	return entry?.[0] ?? filterId;
}

export function getFilterEmoji(filterId: string): string | undefined {
	const entry = filters[filterId as keyof typeof filters];
	return entry?.[1];
}

export function displayFilter(filterId: string): string {
	const name = getFilterName(filterId);
	const emoji = getFilterEmoji(filterId);
	return emoji ? `${emoji} ${name}` : name;
}

export function formatFilterList(
	filterIds: readonly string[],
	statusEmoji?: string,
	emptyText = "None",
	maxLines = 25,
): string {
	const uniqueNames = [
		...new Set(
			filterIds.map((filterId) => {
				const display = displayFilter(filterId);
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
