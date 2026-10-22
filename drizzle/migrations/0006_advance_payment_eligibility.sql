CREATE TABLE `advance_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`required_advance_bps` int NOT NULL,
	`published_by_staff_user_id` int NOT NULL,
	`published_at` bigint NOT NULL,
	`superseded_at` bigint,
	`is_current` tinyint,
	CONSTRAINT `advance_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `advance_policies_one_current_uq` UNIQUE(`is_current`)
);
--> statement-breakpoint
CREATE TABLE `order_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`door_order_id` int NOT NULL,
	`amount_minor` bigint NOT NULL,
	`reference` varchar(128),
	`recorded_by_staff_user_id` int NOT NULL,
	`received_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `order_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `advance_policies` ADD CONSTRAINT `advance_policies_published_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`published_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_payments` ADD CONSTRAINT `order_payments_door_order_id_door_orders_id_fk` FOREIGN KEY (`door_order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_payments` ADD CONSTRAINT `order_payments_recorded_by_staff_user_id_staff_users_id_fk` FOREIGN KEY (`recorded_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `advance_policies_published_by_idx` ON `advance_policies` (`published_by_staff_user_id`);--> statement-breakpoint
CREATE INDEX `order_payments_door_order_idx` ON `order_payments` (`door_order_id`);--> statement-breakpoint
CREATE INDEX `order_payments_recorded_by_idx` ON `order_payments` (`recorded_by_staff_user_id`);
--> statement-breakpoint
ALTER TABLE `advance_policies` ADD CONSTRAINT `advance_policies_bps_ck` CHECK (`required_advance_bps` BETWEEN 0 AND 10000);
--> statement-breakpoint
ALTER TABLE `advance_policies` ADD CONSTRAINT `advance_policies_current_ck` CHECK (`is_current` IS NULL OR `is_current` = 1);
--> statement-breakpoint
ALTER TABLE `order_payments` ADD CONSTRAINT `order_payments_amount_ck` CHECK (`amount_minor` > 0);
--> statement-breakpoint
CREATE TRIGGER `advance_policies_term_immutable`
BEFORE UPDATE ON `advance_policies`
FOR EACH ROW
BEGIN
  IF NEW.`required_advance_bps` <> OLD.`required_advance_bps`
     OR NEW.`published_by_staff_user_id` <> OLD.`published_by_staff_user_id`
     OR NEW.`published_at` <> OLD.`published_at`
     OR NEW.`id` <> OLD.`id` THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Published advance policy term is immutable';
  END IF;
END
--> statement-breakpoint
CREATE TRIGGER `order_payments_append_only_update`
BEFORE UPDATE ON `order_payments`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Confirmed payments are append-only';
END
--> statement-breakpoint
CREATE TRIGGER `order_payments_append_only_delete`
BEFORE DELETE ON `order_payments`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Confirmed payments are append-only';
END
--> statement-breakpoint
CREATE TRIGGER `door_orders_accepted_total_immutable`
BEFORE UPDATE ON `door_orders`
FOR EACH ROW
BEGIN
  IF OLD.`accepted_total_minor` IS NOT NULL
     AND NOT (NEW.`accepted_total_minor` <=> OLD.`accepted_total_minor`) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Accepted total is immutable';
  END IF;
END