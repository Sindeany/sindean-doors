CREATE TABLE `bom_lineages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lineage_code` varchar(64) NOT NULL,
	`scope_kind` enum('factory','product') NOT NULL,
	`product_id` varchar(100),
	`scope_key` varchar(128) NOT NULL,
	`created_by_staff_user_id` int NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `bom_lineages_id` PRIMARY KEY(`id`),
	CONSTRAINT `bom_lineages_code_uq` UNIQUE(`lineage_code`),
	CONSTRAINT `bom_lineages_scope_key_uq` UNIQUE(`scope_key`)
);
--> statement-breakpoint
CREATE TABLE `bom_rule_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lineage_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`version` int NOT NULL,
	`rule_set_status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`created_by_staff_user_id` int NOT NULL,
	`published_by_staff_user_id` int,
	`published_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `bom_rule_sets_id` PRIMARY KEY(`id`),
	CONSTRAINT `bom_rule_sets_lineage_version_uq` UNIQUE(`lineage_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `bom_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rule_set_id` int NOT NULL,
	`inventory_item_id` int NOT NULL,
	`sort_order` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`rule_kind` enum('fixed_per_order','fixed_per_door','linear_dimension','area_dimensions','when_selection') NOT NULL,
	`quantity` int NOT NULL,
	`dimension_key` varchar(64),
	`secondary_dimension_key` varchar(64),
	`selection_key` varchar(64),
	`selection_value` varchar(255),
	`bom_rule_applies_per` enum('order','door'),
	`waste_numerator` int NOT NULL DEFAULT 0,
	`waste_denominator` int NOT NULL DEFAULT 1,
	`expected_unit` varchar(50) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `bom_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `bom_rules_set_sort_uq` UNIQUE(`rule_set_id`,`sort_order`)
);
--> statement-breakpoint
CREATE TABLE `bom_snapshot_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshot_id` int NOT NULL,
	`line_number` int NOT NULL,
	`rule_id` int NOT NULL,
	`inventory_item_id` int NOT NULL,
	`required_qty` int NOT NULL,
	`unit` varchar(50) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `bom_snapshot_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `bom_snapshot_lines_snapshot_line_uq` UNIQUE(`snapshot_id`,`line_number`)
);
--> statement-breakpoint
CREATE TABLE `bom_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`door_order_id` int NOT NULL,
	`canonical_number` varchar(32) NOT NULL,
	`rule_set_id` int NOT NULL,
	`lineage_code` varchar(64) NOT NULL,
	`rule_set_version` int NOT NULL,
	`created_by_staff_user_id` int NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `bom_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `bom_snapshots_door_order_uq` UNIQUE(`door_order_id`)
);
--> statement-breakpoint
ALTER TABLE `bom_lineages` ADD CONSTRAINT `bom_lineages_created_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`created_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_rule_sets` ADD CONSTRAINT `bom_rule_sets_lineage_id_bom_lineages_id_fk` FOREIGN KEY (`lineage_id`) REFERENCES `bom_lineages`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_rule_sets` ADD CONSTRAINT `bom_rule_sets_created_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`created_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_rule_sets` ADD CONSTRAINT `bom_rule_sets_published_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`published_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_rules` ADD CONSTRAINT `bom_rules_rule_set_id_bom_rule_sets_id_fk` FOREIGN KEY (`rule_set_id`) REFERENCES `bom_rule_sets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_rules` ADD CONSTRAINT `bom_rules_inventory_item_id_inventory_items_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_snapshot_lines` ADD CONSTRAINT `bom_snapshot_lines_snapshot_id_bom_snapshots_id_fk` FOREIGN KEY (`snapshot_id`) REFERENCES `bom_snapshots`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_snapshot_lines` ADD CONSTRAINT `bom_snapshot_lines_rule_id_bom_rules_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `bom_rules`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_snapshot_lines` ADD CONSTRAINT `bom_snapshot_lines_inventory_item_id_inventory_items_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_snapshots` ADD CONSTRAINT `bom_snapshots_door_order_id_door_orders_id_fk` FOREIGN KEY (`door_order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_snapshots` ADD CONSTRAINT `bom_snapshots_rule_set_id_bom_rule_sets_id_fk` FOREIGN KEY (`rule_set_id`) REFERENCES `bom_rule_sets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_snapshots` ADD CONSTRAINT `bom_snapshots_created_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`created_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bom_rule_sets_lineage_status_idx` ON `bom_rule_sets` (`lineage_id`,`rule_set_status`);--> statement-breakpoint
CREATE INDEX `bom_rules_inventory_item_idx` ON `bom_rules` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `bom_snapshot_lines_inventory_item_idx` ON `bom_snapshot_lines` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `bom_snapshots_canonical_number_idx` ON `bom_snapshots` (`canonical_number`);--> statement-breakpoint
CREATE INDEX `bom_snapshots_rule_set_idx` ON `bom_snapshots` (`rule_set_id`);
--> statement-breakpoint
ALTER TABLE `bom_lineages` ADD CONSTRAINT `bom_lineages_scope_ck` CHECK (
  (`scope_kind` = 'factory' AND `product_id` IS NULL AND `scope_key` = 'factory')
  OR
  (`scope_kind` = 'product' AND `product_id` IS NOT NULL AND `scope_key` = CONCAT('product:', `product_id`))
);
--> statement-breakpoint
CREATE TRIGGER `bom_lineages_scope_immutable`
BEFORE UPDATE ON `bom_lineages`
FOR EACH ROW
BEGIN
  IF NEW.`lineage_code` <> OLD.`lineage_code`
     OR NEW.`scope_kind` <> OLD.`scope_kind`
     OR NOT (NEW.`product_id` <=> OLD.`product_id`)
     OR NEW.`scope_key` <> OLD.`scope_key` THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'BOM lineage scope is immutable';
  END IF;
END