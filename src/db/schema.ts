import { relations, sql } from "drizzle-orm";
import {
	foreignKey,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export type Filters = {
	[key: string]: {
		id: string;
		logoUrl: string;
	};
};
export const filters: Filters = {
	"": {
		id: "",
		logoUrl: "",
	},
};

const snowflake = (name: string) => text(name);

export const guild = sqliteTable("guild", {
	guildId: snowflake("guild_id").notNull().primaryKey(),
	monthlyLimit: integer("monthly_limit").notNull().default(3),
	premiumLimits: text("premium_limits", { mode: "json" })
		.$type<Record<string, number>>()
		.notNull()
		.default(sql`(json_object())`),
	filterRoleIds: text("filter_role_ids", { mode: "json" })
		.$type<Record<string, string>>()
		.notNull()
		.default(sql`(json_object())`),
	logChannelId: snowflake("log_channel_id"),
	logChannelBlockedLinkReports: snowflake("log_channel_blocked_link_reports"),
	logChannelCohortApprovals: snowflake("log_channel_cohort_approvals"),
	monthlyCycle: text("monthly_cycle", {
		enum: ["first", "relative"],
	})
		.notNull()
		.default("first"),
	isBlacklisted: integer("is_blacklisted").notNull().default(0),
	customByodHost: text("custom_byod_host"),
	customByodHostAPIKey: text("custom_byod_host_api_key"),
	dispenseMode: text("dispense_mode", {
		enum: ["traditional", "cohort"],
	})
		.notNull()
		.default("cohort"),
	automaticDispense: integer("automatic_dispense").notNull().default(0),
	docsUrl: text("docs_url"),
	reportsChannelId: snowflake("reports_channel_id"),
});

export const guildCohorts = sqliteTable("guild_cohorts", {
	customEnterprisePolicyDomain: text("custom_enterprise_policy_domain"),
	filters: text("filters", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
});

export const guildConfigHistory = sqliteTable(
	"guild_config_history",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		guildId: snowflake("guild_id").notNull(),
		configKey: text("config_key").notNull(),
		previousValue: text("previous_value"),
		changedAt: integer("changed_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => [
		foreignKey({
			columns: [t.guildId],
			foreignColumns: [guild.guildId],
			name: "config_history_guild_fk",
		}).onDelete("cascade"),
	],
);

export const guildUsers = sqliteTable(
	"guild_users",
	{
		guildId: snowflake("guild_id").notNull(),
		userId: snowflake("user_id").notNull(),
		receivedLinks: text("received_links", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default(sql`(json_array())`),
		timesMonthlyCycle: integer("times_monthly_cycle").notNull().default(0),
		timesUserCycle: integer("times_user_cycle").notNull().default(0),
		firstTimeUserCycleTimestamp: integer("first_time_user_cycle_timestamp", {
			mode: "timestamp_ms",
		}),
		isBlacklisted: integer("is_blacklisted").notNull().default(0),
	},
	(t) => [
		primaryKey({ columns: [t.guildId, t.userId] }),
		foreignKey({
			columns: [t.guildId],
			foreignColumns: [guild.guildId],
			name: "users_guild_fk",
		}).onDelete("cascade"),
	],
);

export const globalConfig = sqliteTable("global_config", {
	botOwnerIds: text("bot_owner_ids", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
});

export const globalUsers = sqliteTable("global_users", {
	userId: snowflake("user_id").notNull().primaryKey(),
	isBlacklisted: integer("is_blacklisted").notNull().default(0),
	customEnterprisePolicyDomain: text("custom_enterprise_policy_domain"),
	chosenFilters: text("filters", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
	subscribedGuilds: text("subscribed_guilds", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
});

export const categories = sqliteTable(
	"categories",
	{
		guildId: snowflake("guild_id").notNull(),
		categoryId: text("category_id").notNull(),
		emojiId: text("emoji_id").notNull().default(""),
		filterApiEnabled: integer("filter_api_enabled").notNull().default(1),
	},
	(t) => [
		primaryKey({ columns: [t.guildId, t.categoryId] }),
		foreignKey({
			columns: [t.guildId],
			foreignColumns: [guild.guildId],
			name: "categories_guild_fk",
		}).onDelete("cascade"),
	],
);

export const links = sqliteTable(
	"links",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		guildId: snowflake("guild_id").notNull(),
		categoryId: text("category_id").notNull(),
		link: text("link").notNull(),
		blockedFilters: text("blocked_filters", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default(sql`(json_array())`),
		lastBlockCheckTimestamp: integer("last_blocked_check_timestamp", {
			mode: "timestamp_ms",
		}),
	},
	(t) => [
		foreignKey({
			columns: [t.guildId],
			foreignColumns: [guild.guildId],
			name: "links_guild_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [t.guildId, t.categoryId],
			foreignColumns: [categories.guildId, categories.categoryId],
			name: "links_category_fk",
		}).onDelete("cascade"),
	],
);

export const usersRelations = relations(guildUsers, ({ one }) => ({
	guild: one(guild, {
		fields: [guildUsers.guildId],
		references: [guild.guildId],
	}),
}));

export const guildRelations = relations(guild, ({ many }) => ({
	users: many(guildUsers),
	categories: many(categories),
	links: many(links),
	configHistory: many(guildConfigHistory),
}));

export const guildConfigHistoryRelations = relations(
	guildConfigHistory,
	({ one }) => ({
		guild: one(guild, {
			fields: [guildConfigHistory.guildId],
			references: [guild.guildId],
		}),
	}),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	guild: one(guild, {
		fields: [categories.guildId],
		references: [guild.guildId],
	}),
	links: many(links),
}));

export const linksRelations = relations(links, ({ one }) => ({
	guild: one(guild, {
		fields: [links.guildId],
		references: [guild.guildId],
	}),
	category: one(categories, {
		fields: [links.guildId, links.categoryId],
		references: [categories.guildId, categories.categoryId],
	}),
}));

export type InsertGuild = typeof guild.$inferInsert;
export type SelectGuild = typeof guild.$inferSelect;

export type InsertGuildConfigHistory = typeof guildConfigHistory.$inferInsert;
export type SelectGuildConfigHistory = typeof guildConfigHistory.$inferSelect;

export type InsertUser = typeof guildUsers.$inferInsert;
export type SelectUser = typeof guildUsers.$inferSelect;

export type InsertGlobalConfig = typeof globalConfig.$inferInsert;
export type SelectGlobalConfig = typeof globalConfig.$inferSelect;

export type InsertGlobalUser = typeof globalUsers.$inferInsert;
export type SelectGlobalUser = typeof globalUsers.$inferSelect;

export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;

export type InsertLink = typeof links.$inferInsert;
export type SelectLink = typeof links.$inferSelect;
