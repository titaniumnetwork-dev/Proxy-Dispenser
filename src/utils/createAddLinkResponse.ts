/**
 * @fileoverview Utility for building user-facing response messages from link adding operations.
 * @module utils/link-response-builder
 */

import type { LinkAdderResult } from "@utils/linkAdder";
import {
	calculateTemplateSpace,
	LIST_PLACEHOLDER,
	truncateList,
} from "@utils/messageTemplating";

export interface LinkResponseOptions {
	/**
	 * Result from calling `LinkAdder.add()`
	 */
	linkAddResult: LinkAdderResult;
	/**
	 * Category ID for context in messages.
	 */
	categoryId: string;
	/**
	 * Optionally, a prefix message to include at the start of the response.
	 */
	prefixMessage?: string;
	ephemeral: boolean;
}

/**
 * Types of response types that can be returned from `createLinkResponse()`, which are used by the modals to handle the response appropriately.
 */
export enum LinkResponseType {
	Success = "success",
	AllDuplicates = "all_duplicates",
	AllInvalid = "all_invalid",
	NoValidLinks = "no_valid_links",
}
/**
 * Creates a user-facing response message from a link add operation result.
 * @param options Options for creating the response.
 * @returns Content or string response type, so the modals can handle the response appropriately.
 */
export function createLinkResponse(
	options: LinkResponseOptions,
):
	| { type: LinkResponseType.Success; content: string; ephemeral: boolean }
	| { type: LinkResponseType.AllDuplicates; ephemeral: boolean }
	| { type: LinkResponseType.AllInvalid; ephemeral: boolean }
	| { type: LinkResponseType.NoValidLinks; ephemeral: boolean } {
	const {
		linkAddResult: result,
		categoryId,
		prefixMessage,
		ephemeral,
	} = options;
	const responseParts: string[] = [];

	if (prefixMessage) {
		responseParts.push(prefixMessage);
	}

	const addedLinkWord = result.insertedCount === 1 ? "link" : "links";
	const duplicateLinkWord =
		result.duplicateLinks.length === 1 ? "link" : "links";
	const invalidLinkWord = result.invalidLinks.length === 1 ? "link" : "links";

	if (result.insertedCount > 0) {
		responseParts.push(
			`Added **${result.insertedCount}** ${addedLinkWord} to category **${categoryId}**`,
		);
	}

	if (result.duplicateLinks.length > 0) {
		if (result.invalidLinks.length === 0 && result.insertedCount === 0) {
			return { type: LinkResponseType.AllDuplicates, ephemeral: ephemeral };
		}
	}

	if (result.invalidLinks.length > 0) {
		if (result.duplicateLinks.length === 0 && result.insertedCount === 0) {
			return { type: LinkResponseType.AllInvalid, ephemeral: ephemeral };
		}
	}

	const hasDuplicates = result.duplicateLinks.length > 0;
	const hasInvalid = result.invalidLinks.length > 0;
	const linkListCount = (hasDuplicates ? 1 : 0) + (hasInvalid ? 1 : 0);

	if (linkListCount > 0) {
		const templateParts = [...responseParts];

		if (hasDuplicates) {
			const count = result.duplicateLinks.length;
			templateParts.push(
				`Skipped **${count}** duplicate ${duplicateLinkWord}: \`${LIST_PLACEHOLDER}\``,
			);
		}

		if (hasInvalid) {
			const count = result.invalidLinks.length;
			templateParts.push(
				`Skipped **${count}** invalid ${invalidLinkWord}: \`${LIST_PLACEHOLDER}\``,
			);
		}

		const template = templateParts.join("\n");
		const availablePerList = calculateTemplateSpace({
			template,
			placeholderCount: linkListCount,
		});

		if (hasDuplicates) {
			const count = result.duplicateLinks.length;
			const truncated = truncateList(result.duplicateLinks, availablePerList);
			responseParts.push(
				`Skipped **${count}** duplicate ${duplicateLinkWord}: \`${truncated}\``,
			);
		}

		if (hasInvalid) {
			const count = result.invalidLinks.length;
			const truncated = truncateList(result.invalidLinks, availablePerList);
			responseParts.push(
				`Skipped **${count}** invalid ${invalidLinkWord}: \`${truncated}\``,
			);
		}
	}

	if (responseParts.length === 0) {
		return { type: LinkResponseType.NoValidLinks, ephemeral: ephemeral };
	}

	return {
		type: LinkResponseType.Success,
		content: responseParts.join("\n"),
		ephemeral: ephemeral,
	};
}
