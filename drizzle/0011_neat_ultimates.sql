ALTER TABLE `users` ADD `two_factor_enabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_token` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_code_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_expires_at` datetime(3);--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_attempts` int DEFAULT 0 NOT NULL;