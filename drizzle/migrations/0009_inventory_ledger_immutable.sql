CREATE TRIGGER `inventory_transactions_append_only_update`
BEFORE UPDATE ON `inventory_transactions`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Inventory movements are append-only';
END
--> statement-breakpoint
CREATE TRIGGER `inventory_transactions_append_only_delete`
BEFORE DELETE ON `inventory_transactions`
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Inventory movements are append-only';
END
