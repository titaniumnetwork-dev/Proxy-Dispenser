/**
 * @fileoverview This module contains commonly used info embeds.
 * @module utils/info-embeds
 */

import { type CommandContext, Embed, type ModalContext } from "seyfert";
import { MessageFlags } from "seyfert/lib/types";
import { DISCORD_EMBED_DESCRIPTION_LIMIT } from "@/consts";

/**
 * Creates an embed for a warning.
 * @param error Error message.
 * @returns An embed for a warning.
 */
export function createWarningEmbed(error: string) {
	return new Embed()
		.setColor("Orange")
		.setTitle("Warning")
		.setDescription(error.slice(0, DISCORD_EMBED_DESCRIPTION_LIMIT));
}

/**
 * Creates an embed for an error.
 * @param error Error message.
 * @param userError Whether the error was caused by the user misusing the bot.
 * @returns An embed for an error.
 */
export function createErrorEmbed(error: string, userError = false) {
	return new Embed()
		.setColor("Red")
		.setTitle(userError ? "Error" : "Bot Error")
		.setDescription(error.slice(0, DISCORD_EMBED_DESCRIPTION_LIMIT));
}

/**
 * Creates an embed for a slash command used outside of a guild.
 * @param ctx A Seyfert context object.
 */
export async function createSlashCommandErrorEmbed(
	ctx: CommandContext | ModalContext,
) {
	ctx.client.logger.error(`Slash command incorrectly used outside of a guild`);
	await ctx.editOrReply({
		embeds: [
			createErrorEmbed("This command can only be used in a guild", true),
		],
		flags: MessageFlags.Ephemeral,
	});
}

// Custom embeds for abstraction
/**
 * Creates a user-facing error embed for unexpected errors.
 * Includes context about what action failed without exposing internal details.
 * @param action Description of what the user was trying to do
 * @returns An embed for the unexpected error.
 */
export function createUnexpectedErrorEmbed(action: string): Embed {
	return createErrorEmbed(`An unexpected error occurred while ${action}`);
}
