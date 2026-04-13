import { filters } from "@../config.json";

export function getFilterName(filterId: string): string {
	return filters[filterId as keyof typeof filters] ?? filterId;
}

export function formatFilterList(
	filterIds: readonly string[],
	emptyText = "None",
	maxLines = 25,
): string {
	const uniqueNames = [...new Set(filterIds.map(getFilterName))];

	if (uniqueNames.length === 0) {
		return emptyText;
	}

	return uniqueNames
		.slice(0, maxLines)
		.map((name) => `- ${name}`)
		.join("\n");
}
