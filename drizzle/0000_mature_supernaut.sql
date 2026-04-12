CREATE TABLE `categories` (
	`guild_id` text NOT NULL,
	`category_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`emoji_id` text DEFAULT '' NOT NULL,
	`filter_api_enabled` integer DEFAULT 1 NOT NULL,
	`masqr_enabled` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`guild_id`, `category_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guild`(`guild_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `global_config` (
	`bot_owner_ids` text DEFAULT (json_array()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `global_users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`is_blacklisted` integer DEFAULT 0 NOT NULL,
	`custom_enterprise_policy_domain` text,
	`filters` text DEFAULT (json_array()) NOT NULL,
	`subscribed_guilds` text DEFAULT (json_array()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guild` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`monthly_limit` integer DEFAULT 3 NOT NULL,
	`premium_limits` text DEFAULT (json_object()) NOT NULL,
	`filter_role_ids` text DEFAULT (json_object()) NOT NULL,
	`log_channel_id` text,
	`log_channel_blocked_link_reports` text,
	`log_channel_cohort_approvals` text,
	`monthly_cycle` text DEFAULT 'first' NOT NULL,
	`is_blacklisted` integer DEFAULT 0 NOT NULL,
	`custom_byod_host` text,
	`custom_byod_host_api_key` text,
	`dispense_mode` text DEFAULT 'cohort' NOT NULL,
	`automatic_dispense` integer DEFAULT 0 NOT NULL,
	`docs_url` text,
	`reports_channel_id` text
);
--> statement-breakpoint
CREATE TABLE `guild_cohorts` (
	`custom_enterprise_policy_domain` text,
	`filters` text DEFAULT (json_array()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `guild_config_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`config_key` text NOT NULL,
	`previous_value` text,
	`changed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guild`(`guild_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild_users` (
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`received_links` text DEFAULT (json_array()) NOT NULL,
	`times_monthly_cycle` integer DEFAULT 0 NOT NULL,
	`times_user_cycle` integer DEFAULT 0 NOT NULL,
	`first_time_user_cycle_timestamp` integer,
	`is_blacklisted` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`guild_id`, `user_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guild`(`guild_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`category_id` text NOT NULL,
	`link` text NOT NULL,
	`blocked_filters` text DEFAULT (json_array()) NOT NULL,
	`last_blocked_check_timestamp` integer,
	FOREIGN KEY (`guild_id`) REFERENCES `guild`(`guild_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guild_id`,`category_id`) REFERENCES `categories`(`guild_id`,`category_id`) ON UPDATE no action ON DELETE cascade
);
