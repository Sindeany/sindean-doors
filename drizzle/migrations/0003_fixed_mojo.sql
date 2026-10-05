ALTER TABLE `inventory_transactions` ADD `staff_user_id` int;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_staff_user_id_staff_users_id_fk` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `staff_user_id_idx` ON `inventory_transactions` (`staff_user_id`);