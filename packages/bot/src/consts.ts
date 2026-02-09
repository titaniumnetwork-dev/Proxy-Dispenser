/**
 * @fileoverview Constants used throughout the bot.
 */

// Standardized format for custom IDs is: `command:id:part1:part2:...:ephemeral?` (always ends with an optional `ephemeral`)
export const DISCORD_ID_SEPARATOR = ":";
export const DISCORD_ID_PARTS = {
	separator: DISCORD_ID_SEPARATOR,
	/**
	 * At the tail (always) end of the IDs to indicate that the component should be ephemeral.
	 */
	ephemeralId: "ephemeral",
} as const;

/**
 * Amount of time in MS to wait before the paginators expire.
 */
export const IDLE_TIMEOUT = 60 * 1000;

// Discord limits
/**
 * @see https://support.discord.com/hc/en-us/articles/360034632292-Sending-Messages
 */
export const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Maximum characters per page for Components v2 TextDisplay.
 * @see https://discord.com/developers/docs/interactions/message-components#text-display
 */
export const DISCORD_TEXT_DISPLAY_LIMIT = 4000;
/**
 * @see https://www.pythondiscord.com/pages/guides/python-guides/discord-embed-limits/
 */
export const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
/**
 * Maximum amount of choices to return for autocomplete.
 */
export const DISCORD_MAX_CHOICES = 25;
