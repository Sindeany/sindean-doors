ALTER TABLE `work_orders` DROP FOREIGN KEY `work_orders_order_id_door_orders_id_fk`;
--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_order_id_door_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict ON UPDATE no action;