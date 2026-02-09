import { relations, sql } from "drizzle-orm";
import {
	foreignKey,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

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
	logChannelId: snowflake("log_channel_id"),
	isBanned: integer("is_banned").notNull().default(0),
});

export const globalBannedUsers = sqliteTable("global_banned_users", {
	userId: snowflake("user_id").notNull().primaryKey(),
	banned: integer("banned").notNull().default(0),
});

export const users = sqliteTable(
	// Excuse the verbosity, I plan to also have a "global_users" table for the planned global features
	"guild_users",
	{
		guildId: snowflake("guild_id").notNull(),
		userId: snowflake("user_id").notNull(),
		chosenFilters: text("chosen_filters", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default(sql`(json_array())`),
		chosenCategory: text("chosen_category").notNull(),
		receivedLinks: text("received_links", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default(sql`(json_array())`),
		timesMonthlyCycle: integer("times_monthly_cycle").notNull().default(0),
		timesUserCycle: integer("times_user_cycle").notNull().default(0),
		firstTimeUserCycleTimestamp: integer("first_time_user_cycle_timestamp", {
			mode: "timestamp_ms",
		}),
		banned: integer("banned").notNull().default(0),
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
export const usersRelations = relations(users, ({ one }) => ({
	guild: one(guild, {
		fields: [users.guildId],
		references: [guild.guildId],
	}),
}));

export const guildRelations = relations(guild, ({ many }) => ({
	users: many(users),
	categories: many(categories),
	links: many(links),
}));

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

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertGlobalBannedUser = typeof globalBannedUsers.$inferInsert;
export type SelectGlobalBannedUser = typeof globalBannedUsers.$inferSelect;

export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;

export type InsertLink = typeof links.$inferInsert;
export type SelectLink = typeof links.$inferSelect;
