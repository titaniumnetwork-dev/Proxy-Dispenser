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

const filtersEnum = (name: string) =>
	text(name, {
		enum: Object.entries(filters).map(([_, value]) => value.id) as [
			string,
			...string[],
		],
	});

const snowflake = (name: string) => text(name);

export const guild = sqliteTable("guild", {
	guildId: snowflake("guild_id").notNull().primaryKey(),
	monthlyLimit: integer("monthly_limit").notNull().default(3),
	premiumLimits: text("premium_limits", { mode: "json" })
		.$type<Record<string, number>>()
		.notNull()
		.default(sql`(json_object())`),
	adminRoleIds: text("admin_role_ids", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
	adminUserIds: text("admin_user_ids", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
	// This is a generic log channel for the bot to send messages to. These are where the logs will be sent if there is no custom log channel set up for a specific category.
	logChannelId: snowflake("log_channel_id"),
	logChannelBlockedLinkReports: snowflake("log_channel_blocked_link_reports"),
	logChannelCohortApprovals: snowflake("log_channel_cohort_approvals"),
	monthlyCycle: text("monthly_cycle", {
		enum: ["first_of_month", "relative_to_user"],
	})
		.notNull()
		.default("relative_to_user"),
	isBanned: integer("is_banned").notNull().default(0),
	customByodHost: text("custom_byod_host"),
	customByodHostAPIKey: text("custom_byod_host_api_key"),
	dispenseMode: text("dispense_mode", {
		enum: ["traditional", "cohort"],
	})
		.notNull()
		.default("cohort"),
	// Automatically dispense links to the user when a link gets blocked
	// It will check daily, but there will be a "Report Blocked" button when DMing or responding to the user's command/panel
	// This report blocked button will trigger for everyone in the cohort to have their links checked, and if it is blocked, give the user a new one
	automaticDispense: integer("automatic_dispense").notNull().default(0),
});

export const guildCohorts = sqliteTable("guild_cohorts", {
	// The primary key is either `custom_enterprise_policy_domain` or `filters`
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
	// Excuse the verbosity, I plan to also have a "global_users" table for the planned global features
	"guild_users",
	{
		guildId: snowflake("guild_id").notNull(),
		userId: snowflake("user_id").notNull(),
		receivedLinks: text("received_links", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default(sql`(json_array())`),
		// We should still track all the cycles in case the server decides to change the monthly cycle type
		timesMonthlyCycle: integer("times_monthly_cycle").notNull().default(0),
		timesUserCycle: integer("times_user_cycle").notNull().default(0),
		firstTimeUserCycleTimestamp: integer("first_time_user_cycle_timestamp", {
			mode: "timestamp_ms",
		}),
		isBanned: integer("is_banned").notNull().default(0),
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
	// For known link leakers
	// TODO: Will be implemented later during bot-owner commands
	isBanned: integer("is_banned").notNull().default(0),
	// TODO: Update all references to use it on the global users table
	// TODO: Use an enum for the chosen filters
	// Maybe? profile id?
	customEnterprisePolicyDomain: text("custom_enterprise_policy_domain"),
	chosenFilters: text("filters", { mode: "json" })
		.$type<string[]>()
		.notNull()
		.default(sql`(json_array())`),
	subscribedGuilds: text("subscribed_guilds", { mode: "json" })
		.$type<string[]>()
		.notNull()
		// Array of guild ids
		.default(sql`(json_array())`),
	/**
	 * From the chrome policy (chrome://policy)
	 * This can be from:
	 * status.user.domain, status.user.enterpriseDomainManager
	 */
});

export const categories = sqliteTable(
	"categories",
	{
		guildId: snowflake("guild_id").notNull(),
		// This must be able to be put as a Custom ID https://discord.com/developers/docs/components/reference#anatomy-of-a-component-custom-id, since it will be added and then prefixed
		categoryId: text("category_id").notNull(),
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
		blockedFilters: filtersEnum("blocked_filters"),
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

// Relations
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

// Types
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
