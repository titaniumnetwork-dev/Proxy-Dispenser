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
	readonly priorityEnabled: boolean;
}

export interface Failure {
	readonly success: false;
	readonly error: string;
}

export type Result = Success | Failure;
class DispenseRejection extends Error {
	override readonly name = "DispenseRejection";
}

type LookupResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: unknown };

async function getLimit(
	guildId: string,
	categoryId: string,
	member: GuildMember | undefined,
	logger: Logger,
): Promise<LookupResult<number>> {
	const [guildOk, guildErr, guildRow] = await t(
		db.query.guild.findFirst({
			where: (g, { eq }) => eq(g.guildId, guildId),
			columns: { monthlyLimit: true, premiumLimits: true },
		}),
	);
	if (!guildOk) {
		logger.error(
			`Failed to fetch guild row for limit lookup (${guildId}): ${guildErr}`,
		);
		return { ok: false, error: guildErr };
	}

	const guildDefault = guildRow ? guildRow.monthlyLimit : 3;
	const premiumLimits = guildRow ? guildRow.premiumLimits : {};

	const [categoryOk, categoryErr, categoryRow] = await t(
		db.query.categories.findFirst({
			where: (c, { eq, and }) =>
				and(eq(c.guildId, guildId), eq(c.categoryId, categoryId)),
			columns: { dispenserLimit: true },
		}),
	);
	if (!categoryOk) {
		logger.error(
			`Failed to fetch category row for limit lookup (${guildId}/${categoryId}): ${categoryErr}`,
		);
		return { ok: false, error: categoryErr };
	}

	const baseLimit =
		categoryRow?.dispenserLimit != null
			? categoryRow.dispenserLimit
			: guildDefault;

	if (!member) return { ok: true, value: baseLimit };

	const limits = [baseLimit];
	const memberRoles = member.roles.keys;
	for (const [roleId, limit] of Object.entries(premiumLimits)) {
		if (memberRoles.includes(roleId)) {
			limits.push(limit);
		}
	}

	return { ok: true, value: Math.max(...limits) };
}

async function isBlacklisted(
	guildId: string,
	userId: string,
	logger: Logger,
): Promise<LookupResult<boolean>> {
	const [guildUserOk, guildUserErr, guildUser] = await t(
		db.query.guildUsers.findFirst({
			where: (u, { eq, and }) =>
				and(eq(u.guildId, guildId), eq(u.userId, userId)),
			columns: { isBlacklisted: true },
		}),
	);
	if (!guildUserOk) {
		logger.error(
			`Failed to fetch guild_users row for blacklist check (${guildId}/${userId}): ${guildUserErr}`,
		);
		return { ok: false, error: guildUserErr };
	}
	if (guildUser?.isBlacklisted) return { ok: true, value: true };

	const [globalUserOk, globalUserErr, globalUser] = await t(
		db.query.globalUsers.findFirst({
			where: (u, { eq }) => eq(u.userId, userId),
			columns: { isBlacklisted: true },
		}),
	);
	if (!globalUserOk) {
		logger.error(
			`Failed to fetch global_users row for blacklist check (${userId}): ${globalUserErr}`,
		);
		return { ok: false, error: globalUserErr };
	}
	if (globalUser?.isBlacklisted) return { ok: true, value: true };

	return { ok: true, value: false };
}

export async function dispense(options: Options): Promise<Result> {
	const { guildId, categoryId, userId, member, logger, client } = options;

	const blacklistResult = await isBlacklisted(guildId, userId, logger);
	if (!blacklistResult.ok) {
		return {
			success: false,
			error: "An unexpected error occurred while verifying your access.",
		};
	}
	if (blacklistResult.value) {
		return {
			success: false,
			error: "You are blacklisted from receiving proxy links.",
		};
	}

	const [guildRowOk, guildRowErr, guildRow] = await t(
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
	if (!guildRowOk) {
		logger.error(
			`Failed to fetch guild row for ${guildId}: ${guildRowErr}`,
		);
		return {
			success: false,
			error: "An unexpected error occurred while loading server settings.",
		};
	}
	if (guildRow?.isBlacklisted) {
		return {
			success: false,
			error: "This server has been blacklisted from receiving proxy links.",
		};
	}

	const [preCatUserOk, preCatUserErr, preCatUser] = await t(
		db.query.categoryUsers.findFirst({
			where: (cu, { eq, and }) =>
				and(
					eq(cu.guildId, guildId),
					eq(cu.categoryId, categoryId),
					eq(cu.userId, userId),
				),
			columns: { timesUserCycle: true },
		}),
	);
	if (!preCatUserOk) {
		logger.error(
			`Failed category usage lookup for ${userId} in ${guildId}/${categoryId}: ${preCatUserErr}`,
		);
		return {
			success: false,
			error: "An unexpected error occurred while checking your usage.",
		};
	}

	const limitResult = await getLimit(guildId, categoryId, member, logger);
	if (!limitResult.ok) {
		return {
			success: false,
			error: "An unexpected error occurred while loading the link limit.",
		};
	}
	const maxLinks = limitResult.value;
	const preUsed = preCatUser ? preCatUser.timesUserCycle : 0;
	if (preUsed >= maxLinks) {
		return {
			success: false,
			error: `You have reached your link limit for **${categoryId}**!`,
		};
	}

	const [linksOk, linksError, allLinks] = await t(
		db.query.links.findMany({
			where: (l, { eq, and }) =>
				and(eq(l.guildId, guildId), eq(l.categoryId, categoryId)),
			columns: { id: true, link: true, blockedFilters: true },
		}),
	);
	if (!linksOk || !allLinks) {
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

	const [preUserOk, preUserErr, preUser] = await t(
		db.query.guildUsers.findFirst({
			where: (u, { eq, and }) =>
				and(eq(u.guildId, guildId), eq(u.userId, userId)),
			columns: { receivedLinks: true },
		}),
	);
	if (!preUserOk) {
		logger.error(
			`Failed received links lookup for ${userId} in ${guildId}: ${preUserErr}`,
		);
		return {
			success: false,
			error: "An unexpected error occurred while checking your history.",
		};
	}
	const preReceivedLinks = preUser ? (preUser.receivedLinks ?? []) : [];
	const available = allLinks.filter(
		(l) => !preReceivedLinks.includes(l.link),
	);

	if (available.length === 0) {
		return {
			success: false,
			error:
				"No new proxy links are available at this time. You have received all available links for this service.",
		};
	}

	const [catOk, catError, catRow] = await t(
		db.query.categories.findFirst({
			where: (c, { eq, and }) =>
				and(eq(c.guildId, guildId), eq(c.categoryId, categoryId)),
			columns: { filterApiEnabled: true, masqrEnabled: true },
		}),
	);
	if (!catOk) {
		logger.error(
			`Failed to fetch category settings for ${guildId}/${categoryId}: ${catError}`,
		);
		return {
			success: false,
			error: "An unexpected error occurred while loading category settings.",
		};
	}

	const priorityEnabled = Boolean(catRow?.filterApiEnabled);

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

	
	let committed: { used: number } | null = null;
	const [txOk, txErr] = await t(
		(async () => {
			committed = db.transaction((tx) => {
				tx.insert(schema.guildUsers)
					.values({
						guildId,
						userId,
						receivedLinks: [],
						timesMonthlyCycle: 0,
						timesUserCycle: 0,
					})
					.onConflictDoNothing()
					.run();

				tx.insert(schema.categoryUsers)
					.values({
						guildId,
						categoryId,
						userId,
						timesUserCycle: 0,
					})
					.onConflictDoNothing()
					.run();

				const userRow = tx
					.select({
						receivedLinks: schema.guildUsers.receivedLinks,
						timesUserCycle: schema.guildUsers.timesUserCycle,
					})
					.from(schema.guildUsers)
					.where(
						and(
							eq(schema.guildUsers.guildId, guildId),
							eq(schema.guildUsers.userId, userId),
						),
					)
					.get();
				if (!userRow) {
					throw new Error("guildUsers row missing after upsert");
				}

				const catUserRow = tx
					.select({
						timesUserCycle: schema.categoryUsers.timesUserCycle,
					})
					.from(schema.categoryUsers)
					.where(
						and(
							eq(schema.categoryUsers.guildId, guildId),
							eq(schema.categoryUsers.categoryId, categoryId),
							eq(schema.categoryUsers.userId, userId),
						),
					)
					.get();
				if (!catUserRow) {
					throw new Error("categoryUsers row missing after upsert");
				}

				const used = catUserRow.timesUserCycle;
				if (used >= maxLinks) {
					throw new DispenseRejection(
						`You have reached your link limit for **${categoryId}**!`,
					);
				}

				const receivedLinks = userRow.receivedLinks ?? [];
				if (receivedLinks.includes(selectedLink.link)) {
					throw new DispenseRejection(
						"That link was just dispensed to you. Please try again.",
					);
				}

				tx.update(schema.guildUsers)
					.set({
						receivedLinks: [...receivedLinks, selectedLink.link],
						timesUserCycle: userRow.timesUserCycle + 1,
					})
					.where(
						and(
							eq(schema.guildUsers.guildId, guildId),
							eq(schema.guildUsers.userId, userId),
						),
					)
					.run();

				tx.update(schema.categoryUsers)
					.set({ timesUserCycle: used + 1 })
					.where(
						and(
							eq(schema.categoryUsers.guildId, guildId),
							eq(schema.categoryUsers.categoryId, categoryId),
							eq(schema.categoryUsers.userId, userId),
						),
					)
					.run();

				return { used };
			});
		})(),
	);

	if (!txOk) {
		if (txErr instanceof DispenseRejection) {
			return { success: false, error: txErr.message };
		}
		logger.error(
			`Dispense transaction failed for ${userId} in ${guildId}/${categoryId}: ${txErr}`,
		);
		return {
			success: false,
			error: "An unexpected error occurred while updating your record.",
		};
	}

	if (!committed) {
		logger.error(
			`Dispense transaction returned no result for ${userId} in ${guildId}/${categoryId}`,
		);
		return {
			success: false,
			error: "An unexpected error occurred while updating your record.",
		};
	}

	const used = (committed as { used: number }).used;
	const remaining = maxLinks - (used + 1);

	if (guildRow?.logChannelId) {
		const linkDisplay = catRow?.masqrEnabled
			? `\`${deliveredLink}\``
			: deliveredLink;

		const [logOk, logErr] = await t(
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
								name: "Remaining (this category)",
								value: String(remaining),
								inline: true,
							},
						],
					},
				],
			}),
		);
		if (!logOk) {
			logger.error(
				`Failed to write proxy log message to ${guildRow.logChannelId} in ${guildId}: ${logErr}`,
			);
		}
	}

	logger.info(
		`Dispensed link to ${userId} in ${guildId}: ${selectedLink.link} (${categoryId})`,
	);

	return {
		success: true,
		link: deliveredLink,
		sourceLink: selectedLink.link,
		remaining,
		hasMore: sortedAvailable.length > 1,
		filterFallback,
		priorityEnabled,
	};
}
