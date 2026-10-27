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

export interface FilterListField {
	name: string;
	value: string;
}

export function formatFilterFields(
	filterIds: readonly string[],
	label: string,
	options: {
		statusEmoji?: string;
		categories?: Readonly<Record<string, string>>;
		emptyText?: string;
		maxLines?: number;
		maxLength?: number;
	} = {},
): FilterListField[] {
	const {
		statusEmoji,
		categories,
		emptyText = "None",
		maxLines = 25,
		maxLength = 1024,
	} = options;

	const lines = [
		...new Set(
			filterIds.map((filterId) => {
				const display = displayFilter(filterId, categories?.[filterId]);
				return statusEmoji ? `${display} ${statusEmoji}` : display;
			}),
		),
	];

	if (lines.length === 0) {
		return [{ name: `${label} (0)`, value: emptyText }];
	}

	const chunks: string[] = [];
	let current: string[] = [];
	let used = 0;
	for (const line of lines.map((display) => `- ${display}`)) {
		if (
			current.length > 0 &&
			(current.length >= maxLines || used + line.length + 1 > maxLength)
		) {
			chunks.push(current.join("\n"));
			current = [];
			used = 0;
		}
		used += current.length > 0 ? line.length + 1 : line.length;
		current.push(line);
	}
	if (current.length > 0) {
		chunks.push(current.join("\n"));
	}

	return chunks.map((value, index) => ({
		name: `${label} (${lines.length})${index > 0 ? " (continued)" : ""}`,
		value,
	}));
}
