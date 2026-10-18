CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`canonical_number` varchar(32),
	`actor_staff_user_id` int,
	`occurred_at` bigint NOT NULL,
	`before_json` json,
	`after_json` json,
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_number_counters` (
	`year` int NOT NULL,
	`last_value` int NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `order_number_counters_year` PRIMARY KEY(`year`)
);
--> statement-breakpoint
ALTER TABLE `door_orders` ADD `canonical_number` varchar(32);--> statement-breakpoint
ALTER TABLE `door_orders` ADD `commercial_status` enum('draft','coordinator_review','admin_review','approved','rejected','cancelled');--> statement-breakpoint
ALTER TABLE `door_orders` ADD `material_state` enum('not_started','pending_materials','partially_reserved','fully_reserved','released') DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `door_orders` ADD `accepted_total_minor` bigint;--> statement-breakpoint
ALTER TABLE `door_orders` ADD `priority_at` bigint;--> statement-breakpoint
ALTER TABLE `door_orders` ADD CONSTRAINT `door_orders_canonical_number_unique` UNIQUE(`canonical_number`);--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_actor_staff_user_id_staff_users_id_fk` FOREIGN KEY (`actor_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `entity_type_entity_id_idx` ON `audit_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `canonical_number_idx` ON `audit_events` (`canonical_number`);--> statement-breakpoint
CREATE INDEX `actor_staff_user_id_idx` ON `audit_events` (`actor_staff_user_id`);--> statement-breakpoint
CREATE INDEX `occurred_at_idx` ON `audit_events` (`occurred_at`);