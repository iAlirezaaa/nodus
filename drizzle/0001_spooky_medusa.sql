CREATE TABLE `room_assets` (
	`room_id` text NOT NULL,
	`asset_id` text NOT NULL,
	PRIMARY KEY(`room_id`, `asset_id`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `room_assets_asset_idx` ON `room_assets` (`asset_id`);--> statement-breakpoint
CREATE TABLE `room_members` (
	`room_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`room_id`, `email`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `room_members_email_idx` ON `room_members` (`email`);--> statement-breakpoint
CREATE TABLE `room_operations` (
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`room_id`, `user_id`, `operation_id`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_presence` (
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`board_id` text NOT NULL,
	`x` real,
	`y` real,
	`selected_node_id` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`room_id`, `user_id`, `session_id`),
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `room_presence_active_idx` ON `room_presence` (`room_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`last_operation_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rooms_owner_idx` ON `rooms` (`owner_user_id`);