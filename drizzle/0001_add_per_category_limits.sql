CREATE TABLE `category_users` (
	`guild_id` text NOT NULL,
	`category_id` text NOT NULL,
	`user_id` text NOT NULL,
	`times_user_cycle` integer DEFAULT 0 NOT NULL,
	`first_time_user_cycle_timestamp` integer,
	PRIMARY KEY(`guild_id`, `category_id`, `user_id`),
	FOREIGN KEY (`guild_id`,`category_id`) REFERENCES `categories`(`guild_id`,`category_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `dispenser_limit` integer;