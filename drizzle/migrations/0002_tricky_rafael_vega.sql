CREATE TABLE `staff_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` bigint NOT NULL,
	`revoked_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `staff_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `staff_user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('admin','sales_coordinator','sales_person','stock_manager','production_manager','laminating','cutting','auto_line','frame_architrave','packing') NOT NULL,
	CONSTRAINT `staff_user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_user_roles_user_id_role_unique` UNIQUE(`user_id`,`role`)
);
--> statement-breakpoint
CREATE TABLE `staff_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`login_name` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `staff_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_users_login_name_unique` UNIQUE(`login_name`)
);
--> statement-breakpoint
ALTER TABLE `staff_sessions` ADD CONSTRAINT `staff_sessions_user_id_staff_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_user_roles` ADD CONSTRAINT `staff_user_roles_user_id_staff_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `staff_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `staff_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `staff_user_roles` (`user_id`);