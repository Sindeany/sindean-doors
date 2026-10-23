CREATE TABLE `material_issue_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`material_issue_id` int NOT NULL,
	`reservation_line_id` int NOT NULL,
	`bom_snapshot_line_id` int NOT NULL,
	`inventory_item_id` int NOT NULL,
	`issued_qty` int NOT NULL,
	`unit` varchar(50) NOT NULL,
	`inventory_transaction_id` int NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `material_issue_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_issue_lines_reservation_uq` UNIQUE(`reservation_line_id`),
	CONSTRAINT `material_issue_lines_transaction_uq` UNIQUE(`inventory_transaction_id`)
);
--> statement-breakpoint
CREATE TABLE `material_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`material_release_id` int NOT NULL,
	`issued_by_staff_user_id` int NOT NULL,
	`issued_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `material_issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_issues_release_uq` UNIQUE(`material_release_id`)
);
--> statement-breakpoint
CREATE TABLE `material_releases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`door_order_id` int NOT NULL,
	`bom_snapshot_id` int NOT NULL,
	`advance_policy_id` int NOT NULL,
	`idempotency_key` varchar(64) NOT NULL,
	`released_by_staff_user_id` int NOT NULL,
	`released_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `material_releases_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_releases_door_order_uq` UNIQUE(`door_order_id`),
	CONSTRAINT `material_releases_idempotency_uq` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
ALTER TABLE `material_issue_lines` ADD CONSTRAINT `mil_issue_fk` FOREIGN KEY (`material_issue_id`) REFERENCES `material_issues`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_issue_lines` ADD CONSTRAINT `mil_reservation_fk` FOREIGN KEY (`reservation_line_id`) REFERENCES `reservation_lines`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_issue_lines` ADD CONSTRAINT `mil_snapshot_line_fk` FOREIGN KEY (`bom_snapshot_line_id`) REFERENCES `bom_snapshot_lines`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_issue_lines` ADD CONSTRAINT `mil_item_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_issue_lines` ADD CONSTRAINT `mil_transaction_fk` FOREIGN KEY (`inventory_transaction_id`) REFERENCES `inventory_transactions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_issues` ADD CONSTRAINT `mi_release_fk` FOREIGN KEY (`material_release_id`) REFERENCES `material_releases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_issues` ADD CONSTRAINT `mi_issued_by_fk` FOREIGN KEY (`issued_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_releases` ADD CONSTRAINT `mr_door_order_fk` FOREIGN KEY (`door_order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_releases` ADD CONSTRAINT `mr_snapshot_fk` FOREIGN KEY (`bom_snapshot_id`) REFERENCES `bom_snapshots`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_releases` ADD CONSTRAINT `mr_advance_policy_fk` FOREIGN KEY (`advance_policy_id`) REFERENCES `advance_policies`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_releases` ADD CONSTRAINT `mr_released_by_fk` FOREIGN KEY (`released_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `material_issue_lines_issue_idx` ON `material_issue_lines` (`material_issue_id`);
--> statement-breakpoint
ALTER TABLE `material_issue_lines` ADD CONSTRAINT `material_issue_lines_qty_ck` CHECK (`issued_qty` > 0);