CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_storage_key_unique` ON `assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `assets_user_id_idx` ON `assets` (`user_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`user_id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
