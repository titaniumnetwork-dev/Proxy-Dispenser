import { db, schema } from "@db";
import { applyMasqr } from "@utils/masqr";
import { and, eq } from "drizzle-orm";
import type { GuildMember, Logger, UsingClient } from "seyfert";
import { t } from "try";

export interface Options {
	readonly guildId: string;
	readonly categoryId: string;
	readonly userId: string;
	readonly member?: GuildMember;
	readonly logger: Logger;
	readonly client: UsingClient;
}

export interface Success {
	readonly success: true;
	readonly link: string;
	readonly sourceLink: string;
	readonly remaining: number;
	readonly hasMore: boolean;
	readonly filterFallback: boolean;
}

export interface Failure {
	readonly success: false;
	readonly error: string;
}

export type Result = Success | Failure;

async function getLimit(
	guildId: string,
	member?: GuildMember,
): Promise<number> {
	const [, , guildRow] = await t(
		db.query.guild.findFirst({
			where: (g, { eq }) => eq(g.guildId, guildId),
			columns: { monthlyLimit: true, premiumLimits: true },
		}),
	);

	const monthlyLimit = guildRow?.monthlyLimit ?? 3;
	const premiumLimits = guildRow?.premiumLimits ?? {};

	if (!member) return monthlyLimit;

	const limits = [monthlyLimit];
	const memberRoles = member.roles.keys;

	for (const [roleId, limit] of Object.entries(premiumLimits)) {
		if (memberRoles.includes(roleId)) {
			limits.push(limit);
		}
	}

	return Math.max(...limits);
}

async function isBlacklisted(
	guildId: string,
	userId: string,
): Promise<boolean> {
	const [, , guildUser] = await t(
		db.query.guildUsers.findFirst({
			where: (u, { eq, and }) =>
				and(eq(u.guildId, guildId), eq(u.userId, userId)),
			columns: { isBlacklisted: true },
		}),
	);
	if (guildUser?.isBlacklisted) return true;

	const [, , globalUser] = await t(
		db.query.globalUsers.findFirst({
			where: (u, { eq }) => eq(u.userId, userId),
			columns: { isBlacklisted: true },
		}),
	);
	if (globalUser?.isBlacklisted) return true;

	return false;
}

export async function dispense(options: Options): Promise<Result> {
	const { guildId, categoryId, userId, member, logger, client } = options;

	const blacklisted = await isBlacklisted(guildId, userId);
	if (blacklisted) {
		return {
			success: false,
			error: "You are blacklisted from receiving proxy links.",
		};
	}

	const [, , guildRow] = await t(
		db.query.guild.findFirst({
			where: (g, { eq }) => eq(g.guildId, guildId),
			columns: {
				isBlacklisted: true,
				logChannelId: true,
				monthlyCycle: true,
				filterRoleIds: true,
			},
		}),
	);
	if (guildRow?.isBlacklisted) {
		return {
			success: false,
			error: "This server has been blacklisted from receiving proxy links.",
		};
	}

	const [, , existingUser] = await t(
		db.query.guildUsers.findFirst({
			where: (u, { eq, and }) =>
				and(eq(u.guildId, guildId), eq(u.userId, userId)),
		}),
	);

	if (!existingUser) {
		await t(
			db
				.insert(schema.guildUsers)
				.values({
					guildId,
					userId,
					receivedLinks: [],
					timesMonthlyCycle: 0,
					timesUserCycle: 0,
				})
				.onConflictDoNothing(),
		);
	}

	const [, , user] = await t(
		db.query.guildUsers.findFirst({
			where: (u, { eq, and }) =>
				and(eq(u.guildId, guildId), eq(u.userId, userId)),
		}),
	);

	if (!user) {
		logger.error(`Failed to get or create record for ${userId}`);
		return {
			success: false,
			error: "An unexpected error occurred. Please try again.",
		};
	}

	const maxLinks = await getLimit(guildId, member);
	const used = user.timesUserCycle;

	if (used >= maxLinks) {
		return {
			success: false,
			error: "You have reached your maximum proxy link limit for this month!",
		};
	}

	const [, linksError, allLinks] = await t(
		db.query.links.findMany({
			where: (l, { eq, and }) =>
				and(eq(l.guildId, guildId), eq(l.categoryId, categoryId)),
			columns: { id: true, link: true, blockedFilters: true },
		}),
	);
	if (linksError || !allLinks) {
		logger.error(`Failed to fetch links: ${linksError}`);
		return {
			success: false,
			error: "An unexpected error occurred while fetching links.",
		};
	}

	if (allLinks.length === 0) {
		return {
			success: false,
			error: `No proxy links are available for **${categoryId}** at this time.`,
		};
	}

	const receivedLinks = user.receivedLinks ?? [];
	const available = allLinks.filter((l) => !receivedLinks.includes(l.link));

	if (available.length === 0) {
		return {
			success: false,
			error:
				"No new proxy links are available at this time. You have received all available links for this service.",
		};
	}

	const [, catError, catRow] = await t(
		db.query.categories.findFirst({
			where: (c, { eq, and }) =>
				and(eq(c.guildId, guildId), eq(c.categoryId, categoryId)),
			columns: { filterApiEnabled: true, masqrEnabled: true },
		}),
	);
	if (catError) {
		logger.error(`Failed to fetch category settings: ${catError}`);
	}

	const priorityEnabled = !catError && Boolean(catRow?.filterApiEnabled);

	const filterRoleIds = guildRow?.filterRoleIds ?? {};
	const memberRoleIds = member?.roles.keys ?? [];
	const filters = Object.entries(filterRoleIds)
		.filter(([, roleId]) => memberRoleIds.includes(roleId))
		.map(([filterId]) => filterId);

	const prioritized =
		priorityEnabled && filters.length > 0
			? (() => {
					const scored = available.map((link) => {
						const blocked = new Set(link.blockedFilters ?? []);
						const unblockedCount = filters.reduce(
							(count, filterId) => count + (blocked.has(filterId) ? 0 : 1),
							0,
						);
						return { link, unblockedCount };
					});

					const maxUnblocked = Math.max(
						...scored.map((item) => item.unblockedCount),
					);
					if (maxUnblocked <= 0) {
						return [];
					}

					return scored
						.filter((item) => item.unblockedCount === maxUnblocked)
						.map((item) => item.link);
				})()
			: [];

	const filterFallback =
		priorityEnabled && filters.length > 0 && prioritized.length === 0;
	const sortedAvailable = prioritized.length > 0 ? prioritized : available;
	const randomIndex = Math.floor(Math.random() * sortedAvailable.length);
	const selectedLink = sortedAvailable[randomIndex];
	if (!selectedLink) {
		return {
			success: false,
			error: "An unexpected error occurred while selecting a link.",
		};
	}

	let deliveredLink = selectedLink.link;
	if (catRow?.masqrEnabled) {
		const masqrResult = await applyMasqr(selectedLink.link);
		if (!masqrResult.ok) {
			return {
				success: false,
				error: masqrResult.error,
			};
		}

		deliveredLink = masqrResult.link;
	}

	const newLinks = [...receivedLinks, selectedLink.link];
	const [, updateError] = await t(
		db
			.update(schema.guildUsers)
			.set({
				receivedLinks: newLinks,
				timesUserCycle: used + 1,
			})
			.where(
				and(
					eq(schema.guildUsers.guildId, guildId),
					eq(schema.guildUsers.userId, userId),
				),
			),
	);
	if (updateError) {
		logger.error(`Failed to update user record: ${updateError}`);
		return {
			success: false,
			error: "An unexpected error occurred while updating your record.",
		};
	}

	if (guildRow?.logChannelId) {
		const linkDisplay = catRow?.masqrEnabled
			? `\`${deliveredLink}\``
			: deliveredLink;

		await t(
			client.messages.write(guildRow.logChannelId, {
				embeds: [
					{
						title: "Proxy Log",
						description: "A user has requested a link.",
						color: 0x5865f2,
						fields: [
							{ name: "Type", value: categoryId, inline: true },
							{ name: "Link", value: linkDisplay, inline: false },
							{
								name: "User",
								value: `<@${userId}>`,
								inline: true,
							},
							{
								name: "Remaining Links",
								value: String(maxLinks - (used + 1)),
								inline: true,
							},
						],
					},
				],
			}),
		);
	}

	logger.info(
		`Dispensed link to ${userId} in ${guildId}: ${selectedLink.link} (${categoryId})`,
	);

	return {
		success: true,
		link: deliveredLink,
		sourceLink: selectedLink.link,
		remaining: maxLinks - (used + 1),
		hasMore: sortedAvailable.length > 1,
		filterFallback,
	};
}
