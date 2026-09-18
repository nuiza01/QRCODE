CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`issuer` varchar(191) NOT NULL,
	`account_id` varchar(191) NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `account_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_issuer_account_uidx` UNIQUE(`issuer`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qr_codes` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`folder_id` varchar(36),
	`name` varchar(160) NOT NULL,
	`mode` enum('static','dynamic') NOT NULL DEFAULT 'static',
	`content_type` enum('url','text','wifi','vcard','email','sms','tel','geo','event','promptpay') NOT NULL,
	`payload` json NOT NULL,
	`style` json NOT NULL,
	`short_code` varchar(32),
	`target_url` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `qr_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `qr_codes_short_code_uidx` UNIQUE(`short_code`)
);
--> statement-breakpoint
CREATE TABLE `qr_target_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`qr_code_id` varchar(36) NOT NULL,
	`old_url` text,
	`new_url` text NOT NULL,
	`changed_by` varchar(36),
	`changed_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `qr_target_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_daily` (
	`qr_code_id` varchar(36) NOT NULL,
	`day` date NOT NULL,
	`country` varchar(2) NOT NULL DEFAULT '',
	`device_type` enum('mobile','tablet','desktop','bot','unknown') NOT NULL DEFAULT 'unknown',
	`count` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `scan_daily_uidx` UNIQUE(`qr_code_id`,`day`,`country`,`device_type`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`qr_code_id` varchar(36) NOT NULL,
	`scanned_at` timestamp(3) NOT NULL DEFAULT (now()),
	`ip_hash` varchar(128),
	`country` varchar(2),
	`city` varchar(160),
	`device_type` enum('mobile','tablet','desktop','bot','unknown') NOT NULL DEFAULT 'unknown',
	`os` varchar(120),
	`browser` varchar(120),
	`referrer` text,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_uidx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` varchar(36) NOT NULL,
	`plan` enum('free','pro','business') NOT NULL DEFAULT 'free',
	`status` enum('active','trialing','past_due','canceled','incomplete') NOT NULL DEFAULT 'active',
	`provider` varchar(64),
	`provider_customer_id` varchar(191),
	`provider_subscription_id` varchar(191),
	`current_period_end` timestamp(3),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folders` ADD CONSTRAINT `folders_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_folder_id_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_target_history` ADD CONSTRAINT `qr_target_history_qr_code_id_qr_codes_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_target_history` ADD CONSTRAINT `qr_target_history_changed_by_user_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scan_daily` ADD CONSTRAINT `scan_daily_qr_code_id_qr_codes_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scans` ADD CONSTRAINT `scans_qr_code_id_qr_codes_id_fk` FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `folders_user_idx` ON `folders` (`user_id`);--> statement-breakpoint
CREATE INDEX `qr_codes_user_created_idx` ON `qr_codes` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `qr_codes_folder_idx` ON `qr_codes` (`folder_id`);--> statement-breakpoint
CREATE INDEX `qr_target_history_qr_idx` ON `qr_target_history` (`qr_code_id`,`changed_at`);--> statement-breakpoint
CREATE INDEX `scan_daily_qr_day_idx` ON `scan_daily` (`qr_code_id`,`day`);--> statement-breakpoint
CREATE INDEX `scans_qr_time_idx` ON `scans` (`qr_code_id`,`scanned_at`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);