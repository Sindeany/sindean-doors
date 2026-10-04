CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL DEFAULT '',
	`account_type` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`normal_balance` enum('debit','credit') NOT NULL,
	`parent_code` varchar(10),
	`is_system` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `bom` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`description` text,
	`total_cost` float NOT NULL DEFAULT 0,
	`labor_cost` float NOT NULL DEFAULT 0,
	`wastage_percentage` float NOT NULL DEFAULT 5,
	`bom_status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`created_by` int,
	`approved_by` int,
	`approved_at` bigint,
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `bom_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bom_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bom_id` int NOT NULL,
	`bom_change_type` enum('created','updated','approved','archived') NOT NULL,
	`changed_by` int NOT NULL,
	`old_data` json,
	`new_data` json,
	`change_reason` text,
	`changed_at` bigint NOT NULL,
	CONSTRAINT `bom_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bom_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bom_id` int NOT NULL,
	`item_id` int NOT NULL,
	`quantity` float NOT NULL,
	`unit_cost` float NOT NULL,
	`total_cost` float NOT NULL,
	`notes` text,
	`line_number` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `bom_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaint_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaint_id` int NOT NULL,
	`msg_from` enum('admin','distributor') NOT NULL,
	`text` text NOT NULL,
	`date` varchar(10) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `complaint_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_number` varchar(50) NOT NULL,
	`distributor_id` int,
	`distributor_name` varchar(255) NOT NULL,
	`company_name` varchar(255),
	`order_number` varchar(50) NOT NULL,
	`product` varchar(255) NOT NULL,
	`complaint_type` enum('size','color','damage','shortage','delay','quality','other') NOT NULL,
	`complaint_status` enum('open','under_review','resolved','rejected','return_pending') NOT NULL DEFAULT 'open',
	`description` text NOT NULL,
	`images` json NOT NULL DEFAULT ('[]'),
	`satisfaction_rating` int,
	`resolved_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `decision_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`distributor` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`city` varchar(100) NOT NULL DEFAULT '',
	`order_total` int NOT NULL DEFAULT 0,
	`dl_decision` enum('approved','rejected','revision_requested') NOT NULL,
	`reason` text,
	`decided_by` varchar(255) NOT NULL,
	`decided_at` varchar(30) NOT NULL,
	`response_time` int NOT NULL DEFAULT 0,
	`items` json,
	`notified` boolean NOT NULL DEFAULT false,
	`follow_up` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `decision_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distributor_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`distributor_id` varchar(100) NOT NULL,
	`distributor_name` varchar(200) NOT NULL,
	`distributor_company` varchar(200),
	`order_type` enum('purchase_order','rfq','sample_request') NOT NULL DEFAULT 'purchase_order',
	`items` text NOT NULL,
	`total_amount` float DEFAULT 0,
	`status` enum('draft','pending','confirmed','manufacturing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`payment_status` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
	`notes` text,
	`source` enum('manual','excel_upload','api') NOT NULL DEFAULT 'manual',
	`excel_file_name` varchar(255),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `distributor_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distributor_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributor_id` int NOT NULL,
	`order_number` varchar(50),
	`amount` float NOT NULL,
	`method` enum('cash','bank_transfer','cheque','card','other') NOT NULL DEFAULT 'bank_transfer',
	`reference` varchar(191),
	`note` text,
	`payment_date` timestamp NOT NULL DEFAULT (now()),
	`status` enum('confirmed','pending','cancelled') NOT NULL DEFAULT 'confirmed',
	`journal_entry_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distributor_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distributor_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributor_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `distributor_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `distributor_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `distributors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255) NOT NULL,
	`city` varchar(100) NOT NULL DEFAULT '',
	`region` varchar(100) NOT NULL DEFAULT '',
	`phone` varchar(50) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`whatsapp` varchar(50),
	`website` varchar(255),
	`commercial_reg` varchar(50),
	`vat_number` varchar(20),
	`bank_name` varchar(255),
	`bank_iban` varchar(40),
	`status_dist` enum('active','pending','suspended','rejected') NOT NULL DEFAULT 'pending',
	`tier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`join_date` varchar(10) NOT NULL,
	`contract_start` varchar(10),
	`contract_end` varchar(10),
	`credit_limit` int DEFAULT 50000,
	`discount_rate` int DEFAULT 5,
	`total_orders` int NOT NULL DEFAULT 0,
	`total_revenue` float NOT NULL DEFAULT 0,
	`avg_rating` float NOT NULL DEFAULT 0,
	`pending_orders` int NOT NULL DEFAULT 0,
	`open_complaints` int NOT NULL DEFAULT 0,
	`notes` text,
	`admin_notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `distributors_id` PRIMARY KEY(`id`),
	CONSTRAINT `distributors_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `door_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`customer_phone` varchar(50) NOT NULL,
	`customer_email` varchar(255),
	`product_id` varchar(100) NOT NULL,
	`product_name` varchar(255) NOT NULL,
	`selections` json NOT NULL,
	`sub_selections` json NOT NULL,
	`dimensions` json,
	`base_price` int NOT NULL DEFAULT 0,
	`total_price` int NOT NULL DEFAULT 0,
	`status` enum('new','reviewing','confirmed','in_production','ready','delivered','cancelled') NOT NULL DEFAULT 'new',
	`workflow_stage` varchar(50) DEFAULT 'po_review',
	`workflow_stages_data` json,
	`priority` enum('normal','urgent','vip') DEFAULT 'normal',
	`expected_delivery` bigint,
	`total_doors` int DEFAULT 1,
	`payment_status_order` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `door_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255),
	`category` enum('wpc_board','film','edge','frame','lock','hinge','accessory','packaging','chemical') NOT NULL,
	`unit` varchar(50) NOT NULL,
	`current_qty` int NOT NULL DEFAULT 0,
	`min_qty` int NOT NULL DEFAULT 0,
	`max_qty` int NOT NULL DEFAULT 0,
	`reorder_qty` int NOT NULL DEFAULT 0,
	`unit_cost` float NOT NULL DEFAULT 0,
	`supplier` varchar(255) NOT NULL DEFAULT '',
	`supplier_phone` varchar(50),
	`location` varchar(255) NOT NULL DEFAULT '',
	`last_received` varchar(10),
	`last_consumed` varchar(10),
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_items_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`type` enum('receive','consume','adjust','return','transfer') NOT NULL,
	`quantity` int NOT NULL,
	`balance_before` int NOT NULL,
	`balance_after` int NOT NULL,
	`reference` varchar(255) NOT NULL DEFAULT '',
	`note` text,
	`performed_by` varchar(255) NOT NULL DEFAULT '',
	`date` varchar(10) NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entry_number` varchar(30) NOT NULL,
	`entry_date` varchar(10) NOT NULL,
	`description` varchar(500) NOT NULL,
	`je_source_type` enum('invoice','payment','manual','vat_settlement') NOT NULL DEFAULT 'manual',
	`source_id` int,
	`total_debit_halala` int NOT NULL DEFAULT 0,
	`total_credit_halala` int NOT NULL DEFAULT 0,
	`is_posted` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `journal_entries_entry_number_unique` UNIQUE(`entry_number`)
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journal_entry_id` int NOT NULL,
	`account_code` varchar(10) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`debit_halala` int NOT NULL DEFAULT 0,
	`credit_halala` int NOT NULL DEFAULT 0,
	`line_description` varchar(500) DEFAULT '',
	`sequence` int NOT NULL DEFAULT 1,
	CONSTRAINT `journal_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packing_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`distributor_name` varchar(255) NOT NULL,
	`total_doors` int NOT NULL DEFAULT 1,
	`packing_type` varchar(50) NOT NULL DEFAULT 'محلي',
	`packing_method` varchar(50) NOT NULL DEFAULT 'فردي',
	`packing_status` enum('pending','in_progress','done') NOT NULL DEFAULT 'pending',
	`delivery_date` varchar(30) NOT NULL DEFAULT '',
	`delivery_status` enum('pending','in_progress','done') NOT NULL DEFAULT 'pending',
	`accounting_status` enum('pending','in_progress','done') NOT NULL DEFAULT 'pending',
	`total_value` int NOT NULL DEFAULT 0,
	`paid_amount` int NOT NULL DEFAULT 0,
	`doors` json,
	`documents` json,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `packing_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_order_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`distributor_name` varchar(255) NOT NULL,
	`total_doors` int NOT NULL DEFAULT 1,
	`completed_at` varchar(20) NOT NULL,
	`planned_days` int NOT NULL DEFAULT 0,
	`actual_days` int NOT NULL DEFAULT 0,
	`client_rating` int NOT NULL DEFAULT 0,
	`client_feedback` text NOT NULL,
	`errors` json,
	`improvements` json,
	`por_status` enum('pending_review','reviewed','closed') NOT NULL DEFAULT 'pending_review',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `post_order_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sections_json` text NOT NULL,
	`updated_at` bigint NOT NULL,
	`updated_by` varchar(100) DEFAULT 'admin',
	CONSTRAINT `product_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`line_id` varchar(50) NOT NULL,
	`name_ar` varchar(100) NOT NULL,
	`name_en` varchar(100) NOT NULL DEFAULT '',
	`daily_capacity` int NOT NULL DEFAULT 20,
	`work_days_per_week` int NOT NULL DEFAULT 6,
	`shift_hours` int NOT NULL DEFAULT 8,
	`is_active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `production_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_lines_line_id_unique` UNIQUE(`line_id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL DEFAULT '',
	`category` varchar(50) NOT NULL,
	`subcategory` varchar(50) NOT NULL DEFAULT '',
	`wood_type` varchar(50) NOT NULL DEFAULT 'oak',
	`product_status` enum('active','archived') NOT NULL DEFAULT 'active',
	`base_price` int NOT NULL DEFAULT 0,
	`distributor_price` int NOT NULL DEFAULT 0,
	`tiers` json,
	`image` longtext NOT NULL,
	`images` json,
	`sizes` json,
	`colors` json,
	`stock` int NOT NULL DEFAULT 0,
	`badge` varchar(100) DEFAULT '',
	`badge_color` varchar(50) DEFAULT '',
	`features` json,
	`description` text NOT NULL DEFAULT (''),
	`specs` json,
	`dimensions` varchar(100) DEFAULT '',
	`rating` float NOT NULL DEFAULT 0,
	`review_count` int NOT NULL DEFAULT 0,
	`in_stock` boolean NOT NULL DEFAULT true,
	`is_new` boolean NOT NULL DEFAULT false,
	`is_bestseller` boolean NOT NULL DEFAULT false,
	`is_certified` boolean NOT NULL DEFAULT false,
	`tags` json,
	`weight` varchar(50) DEFAULT '',
	`warranty` varchar(100) DEFAULT '',
	`options` json,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_number` varchar(100) NOT NULL,
	`supplier_name` varchar(255) NOT NULL,
	`supplier_vat_number` varchar(15),
	`issue_date` varchar(10) NOT NULL,
	`subtotal_halala` int NOT NULL DEFAULT 0,
	`vat_amount_halala` int NOT NULL DEFAULT 0,
	`total_halala` int NOT NULL DEFAULT 0,
	`purchase_category` enum('materials','equipment','services','utilities','other') NOT NULL DEFAULT 'materials',
	`purchase_desc` varchar(500) NOT NULL DEFAULT '',
	`purchase_pay_status` enum('unpaid','paid') NOT NULL DEFAULT 'unpaid',
	`purchase_notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `purchase_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`po_number` varchar(50) NOT NULL,
	`rfq_id` int,
	`supplier_id` int NOT NULL,
	`quote_id` int,
	`title` varchar(255) NOT NULL,
	`items` json NOT NULL,
	`total_price` float NOT NULL,
	`currency` varchar(10) DEFAULT 'SAR',
	`delivery_days` int,
	`payment_terms` varchar(255),
	`delivery_location` varchar(255),
	`status` enum('issued','confirmed','in_progress','delivered','invoiced','paid','cancelled') NOT NULL DEFAULT 'issued',
	`notes` text,
	`issued_at` bigint NOT NULL,
	`confirmed_at` bigint,
	`delivered_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_po_number_unique` UNIQUE(`po_number`)
);
--> statement-breakpoint
CREATE TABLE `qc_inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`qc_order_source` enum('door_order','distributor_order','manual') NOT NULL DEFAULT 'manual',
	`source_id` int,
	`distributor_name` varchar(255) NOT NULL,
	`total_doors` int NOT NULL DEFAULT 1,
	`qc_type` enum('incoming','final','po_matching') NOT NULL,
	`qc_result` enum('pass','fail','pending') NOT NULL DEFAULT 'pending',
	`inspector` varchar(255) NOT NULL DEFAULT '',
	`check_items` json,
	`issues` json,
	`photos` int NOT NULL DEFAULT 0,
	`notes` text,
	`inspected_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `qc_inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_id` int NOT NULL,
	`author_type` enum('admin','supplier') NOT NULL,
	`author_id` int NOT NULL,
	`author_name` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`is_internal` tinyint NOT NULL DEFAULT 0,
	`parent_id` int,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `rfq_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfq_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`status` enum('sent','viewed','accepted','declined','submitted') NOT NULL DEFAULT 'sent',
	`sent_at` bigint NOT NULL,
	`viewed_at` bigint,
	`responded_at` bigint,
	`decline_reason` text,
	CONSTRAINT `rfq_invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_number` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`items` json NOT NULL,
	`currency` varchar(10) DEFAULT 'SAR',
	`delivery_location` varchar(255),
	`delivery_days` int,
	`payment_terms` varchar(255),
	`warranty_months` int,
	`submission_deadline` bigint NOT NULL,
	`status` enum('draft','published','closed','evaluated','awarded','cancelled') NOT NULL DEFAULT 'draft',
	`awarded_supplier_id` int,
	`awarded_at` bigint,
	`award_notes` text,
	`ai_evaluation` json,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `rfqs_id` PRIMARY KEY(`id`),
	CONSTRAINT `rfqs_rfq_number_unique` UNIQUE(`rfq_number`)
);
--> statement-breakpoint
CREATE TABLE `summary_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(50) NOT NULL DEFAULT '',
	`email` varchar(255) NOT NULL DEFAULT '',
	`channels` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `summary_recipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summary_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`send_time` varchar(5) NOT NULL DEFAULT '20:00',
	`active_days` json NOT NULL,
	`enabled_sections` json NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `summary_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summary_send_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sent_at` bigint NOT NULL,
	`recipients_count` int NOT NULL DEFAULT 0,
	`channels` varchar(100) NOT NULL DEFAULT '',
	`summary_status` enum('success','partial','skipped','failed') NOT NULL DEFAULT 'success',
	`snapshot_stats` json,
	`created_at` bigint NOT NULL,
	CONSTRAINT `summary_send_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfq_id` int NOT NULL,
	`supplier_id` int NOT NULL,
	`invitation_id` int,
	`quote_number` varchar(50),
	`total_price` float NOT NULL,
	`currency` varchar(10) DEFAULT 'SAR',
	`line_items` json NOT NULL,
	`delivery_days` int,
	`payment_terms` varchar(255),
	`warranty_months` int,
	`valid_until` bigint,
	`attachments` json,
	`notes` text,
	`technical_notes` text,
	`status` enum('submitted','under_review','shortlisted','awarded','rejected') NOT NULL DEFAULT 'submitted',
	`ai_score` float,
	`ai_score_breakdown` json,
	`ai_recommendation` text,
	`admin_score` float,
	`admin_notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `supplier_quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `supplier_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`contact_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`city` varchar(100),
	`address` text,
	`website` varchar(255),
	`categories` json,
	`password_hash` varchar(255) NOT NULL,
	`status` enum('pending','active','suspended') NOT NULL DEFAULT 'pending',
	`rating` float DEFAULT 0,
	`total_quotes` int DEFAULT 0,
	`won_quotes` int DEFAULT 0,
	`admin_notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `tax_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`invoice_number` varchar(50) NOT NULL,
	`invoice_type` enum('standard','simplified') NOT NULL DEFAULT 'simplified',
	`invoice_type_code` varchar(10) NOT NULL DEFAULT '388',
	`invoice_sub_type_code` varchar(10) NOT NULL DEFAULT '020000',
	`previous_invoice_hash` varchar(64),
	`previous_invoice_number` varchar(50),
	`issue_date` varchar(10) NOT NULL,
	`issue_time` varchar(8) NOT NULL,
	`seller_name` varchar(255) NOT NULL,
	`seller_vat_number` varchar(15) NOT NULL,
	`seller_cr_number` varchar(20),
	`seller_address` text,
	`seller_city` varchar(100),
	`seller_postal_code` varchar(10),
	`buyer_name` varchar(255) NOT NULL,
	`buyer_vat_number` varchar(15),
	`buyer_cr_number` varchar(20),
	`buyer_address` text,
	`buyer_phone` varchar(50),
	`buyer_email` varchar(255),
	`line_items` json NOT NULL,
	`subtotal_halala` int NOT NULL DEFAULT 0,
	`vat_amount_halala` int NOT NULL DEFAULT 0,
	`total_halala` int NOT NULL DEFAULT 0,
	`vat_rate` float NOT NULL DEFAULT 15,
	`qr_code_data` text,
	`invoice_hash` varchar(64),
	`status` enum('draft','issued','paid','cancelled') NOT NULL DEFAULT 'draft',
	`payment_status` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
	`source_type` enum('door_order','distributor_order','manual') DEFAULT 'manual',
	`source_id` int,
	`zatca_status` enum('pending','submitted','cleared','reported','error') DEFAULT 'pending',
	`zatca_submitted_at` bigint,
	`zatca_response_code` varchar(10),
	`zatca_warnings` text,
	`zatca_invoice_xml` longtext,
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `tax_invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `tax_invoices_uuid_unique` UNIQUE(`uuid`),
	CONSTRAINT `tax_invoices_invoice_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`wishlist_ids` json DEFAULT ('[]'),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`wo_number` varchar(50) NOT NULL,
	`po_number` varchar(50) NOT NULL,
	`distributor_name` varchar(255) NOT NULL,
	`distributor_phone` varchar(50) NOT NULL DEFAULT '',
	`issued_at` bigint NOT NULL,
	`start_date` varchar(20) NOT NULL,
	`due_date` varchar(20) NOT NULL,
	`wo_status` enum('draft','issued','in_progress','completed','on_hold','cancelled') NOT NULL DEFAULT 'issued',
	`wo_priority` enum('normal','urgent','vip') NOT NULL DEFAULT 'normal',
	`wo_order_type` enum('standard','custom') NOT NULL DEFAULT 'standard',
	`total_doors` int NOT NULL DEFAULT 1,
	`total_value` float NOT NULL DEFAULT 0,
	`doors` json,
	`dept_tasks` json,
	`supervisor_name` varchar(255) NOT NULL DEFAULT '',
	`notes` text,
	`progress_percent` int NOT NULL DEFAULT 0,
	`cancel_reason` text,
	`cancelled_by` varchar(255),
	`cancelled_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `work_orders_wo_number_unique` UNIQUE(`wo_number`)
);
--> statement-breakpoint
CREATE TABLE `zatca_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seller_name` varchar(255) NOT NULL DEFAULT 'سنديان للأبواب الخشبية',
	`seller_name_en` varchar(255) DEFAULT 'Sindian Wooden Doors',
	`vat_number` varchar(15) NOT NULL DEFAULT '300000000000003',
	`cr_number` varchar(20) DEFAULT '1234567890',
	`address` text,
	`city` varchar(100) DEFAULT 'الرياض',
	`postal_code` varchar(10) DEFAULT '12345',
	`country` varchar(5) DEFAULT 'SA',
	`phone` varchar(50) DEFAULT '920-000-000',
	`email` varchar(255) DEFAULT 'info@sindian.sa',
	`invoice_counter` int NOT NULL DEFAULT 0,
	`zatca_environment` enum('sandbox','production') DEFAULT 'sandbox',
	`zatca_csid` text,
	`zatca_csid_secret` text,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `zatca_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_order_id_door_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `door_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_id_idx` ON `work_orders` (`order_id`);