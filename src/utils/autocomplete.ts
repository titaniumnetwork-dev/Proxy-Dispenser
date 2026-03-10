/**
 * @fileoverview This module contains commonly used autocomplete handlers. There are smart heuristics to make the bot feel more responsive.
 * @module utils/autocomplete
 */

import { DISCORD_MAX_CHOICES } from "@consts";
import { db, schema } from "@db";
import { and, desc, eq, like, sql } from "drizzle-orm";
import type { AutocompleteInteraction } from "seyfert";
import { t } from "try";

export async function categoryAutocomplete(
	interaction: AutocompleteInteraction,
) {
	if (!interaction.guildId) {
		return interaction.respond([]);
	}

	const guildId = interaction.guildId;
	const input = interaction.getInput();

	const [, error, categories] = await t(
		Promise.resolve(
			(async () => {
				const whereConditions = [eq(schema.categories.guildId, guildId)];
				if (input) {
					whereConditions.push(
						like(schema.categories.categoryId, `%${input}%`),
					);
				}

				return db
					.select({
						categoryId: schema.categories.categoryId,
						linkCount: sql<number>`(
							SELECT COUNT(*) FROM ${schema.links}
							WHERE ${schema.links.guildId} = ${schema.categories.guildId}
							AND ${schema.links.categoryId} = ${schema.categories.categoryId}
						)`.as("link_count"),
					})
					.from(schema.categories)
					.where(and(...whereConditions))
					.orderBy(
						desc(
							sql`(
						SELECT COUNT(*) FROM ${schema.links}
						WHERE ${schema.links.guildId} = ${schema.categories.guildId}
						AND ${schema.links.categoryId} = ${schema.categories.categoryId}
					)`,
						),
					)
					.limit(DISCORD_MAX_CHOICES);
			})(),
		),
	);

	if (error || !categories) {
		console.error("Failed to fetch categories for autocomplete:", error);
		return interaction.respond([]);
	}

	const choices = categories
		.map((category) => ({
			name: category.categoryId,
			value: category.categoryId,
		}))
		.slice(0, DISCORD_MAX_CHOICES);

	return interaction.respond(choices);
}

/**
 * Autocomplete handler for links.
 * Meant to be used on string options in Seyfert slash commands.
 * @param interaction Seyfert autocomplete interaction.
 * @returns Seyfert autocomplete response.
 */
export async function linkAutocomplete(interaction: AutocompleteInteraction) {
	if (!interaction.guildId) {
		return interaction.respond([]);
	}

	const guildId = interaction.guildId;
	const input = interaction.getInput();

	const whereConditions = [eq(schema.links.guildId, guildId)];
	if (input) {
		whereConditions.push(like(schema.links.link, `%${input}%`));
	}

	const [, error, linkRows] = await t(
		Promise.resolve(
			db
				.select({
					link: schema.links.link,
					popularity: sql<number>`(
						SELECT COUNT(DISTINCT ${schema.guildUsers.userId})
						FROM ${schema.guildUsers}, json_each(${schema.guildUsers.receivedLinks})
						WHERE ${schema.guildUsers.guildId} = ${schema.links.guildId}
						AND json_each.value = ${schema.links.link}
					)`.as("popularity"),
				})
				.from(schema.links)
				.where(and(...whereConditions))
				.groupBy(schema.links.link)
				.orderBy(
					desc(
						sql`(
							SELECT COUNT(DISTINCT ${schema.guildUsers.userId})
							FROM ${schema.guildUsers}, json_each(${schema.guildUsers.receivedLinks})
							WHERE ${schema.guildUsers.guildId} = ${schema.links.guildId}
							AND json_each.value = ${schema.links.link}
						)`,
					),
				)
				.limit(DISCORD_MAX_CHOICES),
		),
	);

	if (error || !linkRows) {
		return interaction.respond([]);
	}

	const choices = linkRows
		.map((row) => ({
			name: row.link,
			value: row.link,
		}))
		.slice(0, DISCORD_MAX_CHOICES);

	return interaction.respond(choices);
}
