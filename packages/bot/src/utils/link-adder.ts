/**
 * @fileoverview A utility class for inserting links to the DB across `/add` and `/batch-add`.
 * @module utils/link-adder
 */

import { db, schema } from "@dispenser/db";
import type { Logger } from "seyfert";
import { t } from "try";

export interface LinkAdderResult {
	/**
	 * Errors that occurred while inserting links into the database.
	 * Realistically, this is the only place where errors would occur.
	 */
	readonly dbSuccess: boolean;
	/**
	 * Error that occurred while inserting links into the database.
	 * Realistically, this is the only place where errors would occur.
	 */
	readonly dbError?: string;
	/**
	 * Number of links that were inserted into the database.
	 */
	readonly insertedCount: number;
	/**
	 * Whether a new category was created for the links.
	 */
	readonly newCategory: boolean;
	/**
	 * Links that were invalid.
	 */
	readonly invalidLinks: readonly string[];
	/**
	 * Links that were duplicates.
	 */
	readonly duplicateLinks: readonly string[];
}

export interface LinkAdderOptions {
	/**
	 * Guild ID to add links to.
	 */
	readonly guildId: string;
	/**
	 * Category ID to add links to.
	 */
	readonly categoryId: string;
	/**
	 * Seyfert logger.
	 */
	readonly logger: Logger;
}

/**
 * A utility class for insering links to the DB across `/add` and `/batch-add`.
 */
export class LinkAdder {
	/**
	 * Guild ID to add links to.
	 * @private
	 */
	private readonly guildId: string;
	/**
	 * Category ID to add links to.
	 * @private
	 */
	private readonly categoryId: string;
	/**
	 * Seyfert logger.
	 * @private
	 */
	private readonly logger: Logger;

	/**
	 * @param options Options for creating a link adder.
	 */
	constructor(options: LinkAdderOptions) {
		this.guildId = options.guildId;
		this.categoryId = options.categoryId;
		this.logger = options.logger;
	}

	/**
	 * Parse links for when the user inputs them into the bot.
	 * It can handle multiple links separated by commas, spaces, and/or newlines.
	 * @param input Raw input from the user.
	 * @returns Parsed links.
	 */
	public static parseLinks(input: string): string[] {
		const split = input.split(/[,\n]+/);

		const links: string[] = [];
		for (const chunk of split) {
			const parts = chunk.split(/\s+(?=https?:\/\/)/);

			for (const part of parts) {
				const trimmed = part.trim();
				if (trimmed.length > 0) {
					links.push(trimmed);
				}
			}
		}
		return links;
	}

	/**
	 * Check if a link is valid.
	 * @param link Link to check.
	 * @returns Whether the link is valid.
	 */
	private static isValidUrl(link: string): boolean {
		const [ok] = t(() => new URL(link));
		return ok;
	}

	/**
	 * Safely add links to the database.
	 * @param links Links to add.
	 * @returns Result of the operation.
	 */
	async add(links: string | readonly string[]): Promise<LinkAdderResult> {
		const linksArray = Array.isArray(links) ? links : [links];

		const trimmedLinks = linksArray
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		if (trimmedLinks.length === 0) {
			this.logger.warn(
				`No valid links provided for category ${this.categoryId}`,
			);
			return {
				dbSuccess: true,
				insertedCount: 0,
				invalidLinks: [],
				duplicateLinks: [],
				newCategory: false,
			};
		}

		const validLinks: string[] = [];
		const invalidLinks: string[] = [];

		for (const link of trimmedLinks) {
			if (LinkAdder.isValidUrl(link)) {
				validLinks.push(link);
			} else {
				invalidLinks.push(link);
			}
		}

		if (invalidLinks.length > 0) {
			this.logger.warn(`Invalid URLs detected: ${invalidLinks.join(", ")}`);
		}

		if (validLinks.length === 0) {
			return {
				dbSuccess: true,
				insertedCount: 0,
				invalidLinks,
				duplicateLinks: [],
				newCategory: false,
			};
		}

		const [, categoryError, categoryResult] = await t(
			Promise.resolve(
				db
					.insert(schema.categories)
					.values({
						guildId: this.guildId,
						categoryId: this.categoryId,
					})
					.onConflictDoNothing()
					.returning({ categoryId: schema.categories.categoryId }),
			),
		);

		if (categoryError) {
			this.logger.error(
				`Failed to ensure category ${this.categoryId} exists: ${categoryError}`,
			);
			return {
				dbSuccess: false,
				dbError: String(categoryError),
				insertedCount: 0,
				invalidLinks,
				duplicateLinks: [],
				newCategory: false,
			};
		}

		const newCategory = (categoryResult?.length ?? 0) > 0;

		const [, existingLinkError, existingLinks] = await t(
			Promise.resolve(
				db.query.links.findMany({
					where: (links, { eq, and, inArray }) =>
						and(
							eq(links.guildId, this.guildId),
							eq(links.categoryId, this.categoryId),
							inArray(links.link, validLinks),
						),
					columns: { link: true },
				}),
			),
		);

		if (existingLinkError) {
			this.logger.error(
				`Failed to check for existing links: ${existingLinkError}`,
			);
			return {
				dbSuccess: false,
				dbError: String(existingLinkError),
				insertedCount: 0,
				invalidLinks,
				duplicateLinks: [],
				newCategory,
			};
		}

		const duplicateLinks = existingLinks?.map((l) => l.link) ?? [];
		const newLinks = validLinks.filter((l) => !duplicateLinks.includes(l));

		if (duplicateLinks.length > 0) {
			this.logger.warn(
				newLinks.length === 1
					? `User tried to add link ${duplicateLinks[0]} which already exists`
					: `User tried to add ${duplicateLinks.length} links which already exist`,
			);
			this.logger.debug(`Attempted duplicates: ${duplicateLinks.join(", ")}`);
		}

		if (newLinks.length === 0) {
			return {
				dbSuccess: true,
				insertedCount: 0,
				invalidLinks,
				duplicateLinks,
				newCategory,
			};
		}

		const [, insertError] = await t(
			Promise.resolve(
				db.insert(schema.links).values(
					newLinks.map((link) => ({
						guildId: this.guildId,
						categoryId: this.categoryId,
						link,
					})),
				),
			),
		);

		if (insertError) {
			this.logger.error(
				`Failed to add links to category ${this.categoryId}: ${insertError}`,
			);
			return {
				dbSuccess: false,
				dbError: String(insertError),
				insertedCount: 0,
				invalidLinks,
				duplicateLinks,
				newCategory,
			};
		}

		this.logger.info(
			`Added ${newLinks.length} ${newLinks.length === 1 ? "link" : "links"} to category ${this.categoryId}`,
		);
		return {
			dbSuccess: true,
			insertedCount: newLinks.length,
			invalidLinks,
			duplicateLinks,
			newCategory,
		};
	}
}
