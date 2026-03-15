/**
 * @fileoverview This module contains commonly used autocomplete handlers. There are smart heuristics to make the bot feel more responsive.
 * @module utils/autocomplete
 */

import { filters } from "@../config.json";
import { DISCORD_MAX_CHOICES } from "@consts";
import { db, schema } from "@db";
import { and, desc, eq, like, sql } from "drizzle-orm";
import type { AutocompleteInteraction } from "seyfert";
import { t } from "try";

function escapeLikePattern(input: string): string {
	return input.replace(/[%_\\]/g, "\\$&");
}

export async function categoryAutocomplete(
	interaction: AutocompleteInteraction,
) {
	if (!interaction.guildId) {
		return interaction.respond([]);
	}

	const guildId = interaction.guildId;
	const input = interaction.getInput();

	const whereConditions = [eq(schema.categories.guildId, guildId)];
	if (input) {
		whereConditions.push(
			like(schema.categories.categoryId, `%${escapeLikePattern(input)}%`),
		);
	}

	const [, error, categories] = await t(
		db
			.select({
				categoryId: schema.categories.categoryId,
			})
			.from(schema.categories)
			.where(and(...whereConditions))
			.limit(DISCORD_MAX_CHOICES),
	);

	if (error || !categories) {
		console.error("Failed to fetch categories for autocomplete:", error);
		return interaction.respond([]);
	}

	const choices = categories
		.map((category) => ({
			name: category.categoryId.slice(0, 100),
			value: category.categoryId.slice(0, 100),
		}))
		.slice(0, DISCORD_MAX_CHOICES);

	return interaction.respond(choices);
}

export const filterOptions = Object.entries(filters).map(([value, name]) => ({
	name,
	value,
}));

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
		whereConditions.push(
			like(schema.links.link, `%${escapeLikePattern(input)}%`),
		);
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
			name: row.link.slice(0, 100),
			value: row.link.slice(0, 100),
		}))
		.slice(0, DISCORD_MAX_CHOICES);

	return interaction.respond(choices);
}
