CREATE TABLE `reservation_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`door_order_id` int NOT NULL,
	`bom_snapshot_line_id` int NOT NULL,
	`inventory_item_id` int NOT NULL,
	`reserved_qty` int NOT NULL,
	`reservation_line_status` enum('active','cancelled','consumed') NOT NULL DEFAULT 'active',
	`created_by_staff_user_id` int NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `reservation_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `reservation_lines_snapshot_line_uq` UNIQUE(`bom_snapshot_line_id`)
);
--> statement-breakpoint
ALTER TABLE `door_orders` ADD `reservation_advance_policy_id` int;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `reserved_qty` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservation_lines` ADD CONSTRAINT `reservation_lines_door_order_id_door_orders_id_fk` FOREIGN KEY (`door_order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_lines` ADD CONSTRAINT `reservation_lines_bom_snapshot_line_id_bom_snapshot_lines_id_fk` FOREIGN KEY (`bom_snapshot_line_id`) REFERENCES `bom_snapshot_lines`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_lines` ADD CONSTRAINT `reservation_lines_inventory_item_id_inventory_items_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_lines` ADD CONSTRAINT `reservation_lines_created_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`created_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reservation_lines_item_status_idx` ON `reservation_lines` (`inventory_item_id`,`reservation_line_status`);--> statement-breakpoint
CREATE INDEX `reservation_lines_order_idx` ON `reservation_lines` (`door_order_id`);
--> statement-breakpoint
ALTER TABLE `door_orders` ADD CONSTRAINT `door_orders_reservation_advance_policy_id_advance_policies_id_fk` FOREIGN KEY (`reservation_advance_policy_id`) REFERENCES `advance_policies`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_reserved_qty_ck` CHECK (`reserved_qty` >= 0 AND `reserved_qty` <= `current_qty`);--> statement-breakpoint
ALTER TABLE `reservation_lines` ADD CONSTRAINT `reservation_lines_qty_ck` CHECK (`reserved_qty` >= 0 AND (`reservation_line_status` <> 'active' OR `reserved_qty` > 0));
--> statement-breakpoint
CREATE TRIGGER `door_orders_reservation_policy_immutable`
BEFORE UPDATE ON `door_orders`
FOR EACH ROW
BEGIN
  IF OLD.`reservation_advance_policy_id` IS NOT NULL
     AND NOT (NEW.`reservation_advance_policy_id` <=> OLD.`reservation_advance_policy_id`) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Reservation advance policy is immutable';
  END IF;
END