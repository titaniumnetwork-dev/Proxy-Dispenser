import {sql, relations} from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  jsonb,
  bigint,
  timestamp,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';

const snowflake = (name: string) => bigint(name, {mode: 'bigint'});

export const users = pgTable(
  'users',
  {
    guildId: snowflake('guild_id').notNull(),
    userId: snowflake('user_id').notNull(),
    chosenFilters: jsonb('chosen_filters').$type<string[]>(),
    chosenCategory: text('chosen_category').notNull(),
    recievedLinks: jsonb('recieved_links')
      .$type<string[]>()
      .notNull()
      .default([]),
    timesMonthlyCycle: integer('times_monthly_cycle').notNull().default(0),
    timesUserCycle: integer('times_user_cycle').notNull().default(0),
    firstTimeUserCycleTimestamp: timestamp('first_time_user_cycle_timestamp'),
  },
  t => [
    primaryKey({columns: [t.guildId, t.userId]}),
    check(
      'users_times_non_negative',
      sql`${t.timesMonthlyCycle} >= 0 AND ${t.timesUserCycle} >= 0`,
    ),
    check(
      'users_user_cycle_requires_timestamp',
      sql`${t.timesUserCycle} = 0 OR ${t.firstTimeUserCycleTimestamp} IS NOT NULL`,
    ),
  ],
);

export const guild = pgTable(
  'guild',
  {
    guildId: snowflake('guild_id').notNull(),
    categoryId: text('category_id').notNull(),
    limit: integer('limit').notNull(),
    premiumLimits: jsonb('premium_limits')
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    adminRolesIds: snowflake('admin').array(),
    logChannelId: snowflake('log_channel_id'),
  },
  t => [primaryKey({columns: [t.guildId]})],
);

export const categoryLinks = pgTable(
  'category_links',
  {
    guildId: snowflake('guild_id').notNull(),
    categoryId: text('category_id').notNull(),
    links: jsonb('links').$type<Record<string, number>>().notNull(),
  },
  t => [primaryKey({columns: [t.guildId, t.categoryId]})],
);
