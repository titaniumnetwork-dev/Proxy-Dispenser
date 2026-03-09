/**
 * @fileoverview Utility for templated Discord message building with dynamic truncation.
 * @module utils/message-templating
 */

import { DISCORD_MESSAGE_LIMIT } from "@/consts";

/**
 * Separator to use between list items.
 */
const SEPARATOR = ", ";
/**
 * Trailing string to append when a list is truncated.
 */
export const TRUNCATION_INDICATOR = `${SEPARATOR}...`;

/**
 * Placeholder marker for dynamic list insertion in response templates.
 */
export const LIST_PLACEHOLDER = "{{LIST}}";

/**
 * Truncate a list of strings to a maximum length for Discord responses.
 * This is used to display lists of items (like links) in messages without exceeding Discord's limits.
 * @param items Items to truncate.
 * @param maxLength Maximum length of the truncated list.
 * @param separator Separator to use between items.
 * @returns Truncated list string.
 */
export function truncateList(
	items: readonly string[],
	maxLength: number,
	separator = SEPARATOR,
): string {
	if (items.length === 0) return "";

	const truncationLength = TRUNCATION_INDICATOR.length;
	let result = "";
	let keepCount = 0;

	for (const item of items) {
		const current = result ? result + separator + item : item;

		const hasMoreItems = items.length > keepCount + 1;
		const reserveSpace = hasMoreItems ? truncationLength : 0;

		if (current.length + reserveSpace <= maxLength) {
			result = current;
			keepCount++;
		} else {
			if (keepCount > 0) {
				result += TRUNCATION_INDICATOR;
			} else {
				const availableLength = maxLength - truncationLength - SEPARATOR.length;
				result = `${item.slice(0, Math.max(0, availableLength))}...`;
			}
			break;
		}
	}

	return result;
}

/**
 * Options for calculating available template space.
 */
export interface TemplateSpaceOptions {
	/**
	 * Message template with placeholder markers.
	 */
	template: string;
	/**
	 * Number of placeholders to fill with dynamic content.
	 */
	placeholderCount: number;
	/**
	 * Maximum message length (defaults to Discord's limit).
	 */
	maxLength?: number;
	/**
	 * Placeholder string to look for (defaults to `LIST_PLACEHOLDER`).
	 */
	placeholder?: string;
}

/**
 * Calculate available space for dynamic content based on a fixed message template.
 * @param options Options for calculating available space.
 * @returns Available characters per placeholder.
 */
export function calculateTemplateSpace(options: TemplateSpaceOptions): number {
	const {
		template,
		placeholderCount,
		maxLength = DISCORD_MESSAGE_LIMIT,
		placeholder = LIST_PLACEHOLDER,
	} = options;

	const fixedLength = template.length - placeholder.length * placeholderCount;
	const availableSpace = maxLength - fixedLength;
	return Math.floor(availableSpace / placeholderCount);
}

/**
 * Options for building a templated message.
 */
export interface TemplatedMessageOptions {
	/**
	 * Template string with `LIST_PLACEHOLDER` markers.
	 */
	template: string;
	/**
	 * Lists to insert at each placeholder position (in order).
	 */
	lists: readonly (readonly string[])[];
	/**
	 * Maximum message length (defaults to Discord's limit).
	 */
	maxLength?: number;
	/**
	 * Separator to use between list items (defaults to `", "`).
	 */
	separator?: string;
}

/**
 * Build a message from a template, automatically truncating lists to fit within character limits.
 * @param options Options for building the templated message.
 * @returns Final message string with lists inserted and truncated as needed.
 */
export function buildTemplatedMessage(
	options: TemplatedMessageOptions,
): string {
	const {
		template,
		lists,
		maxLength = DISCORD_MESSAGE_LIMIT,
		separator = SEPARATOR,
	} = options;

	const placeholderCount = (
		template.match(new RegExp(LIST_PLACEHOLDER, "g")) || []
	).length;

	if (placeholderCount === 0) {
		return template;
	}

	const availablePerList = calculateTemplateSpace({
		template,
		placeholderCount,
		maxLength,
	});

	let result = template;
	for (const list of lists) {
		const truncated = truncateList(list, availablePerList, separator);
		result = result.replace(LIST_PLACEHOLDER, truncated);
	}

	return result;
}
