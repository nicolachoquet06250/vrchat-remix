CREATE TABLE `project_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`reporter_user_id` int NOT NULL,
	`reason` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `project_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `private_strike_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `last_privated_at` datetime(3);--> statement-breakpoint
ALTER TABLE `users` ADD `role` varchar(20) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `disabled_at` datetime(3);--> statement-breakpoint
CREATE INDEX `pr_project_idx` ON `project_reports` (`project_id`);--> statement-breakpoint
CREATE INDEX `pr_reporter_idx` ON `project_reports` (`reporter_user_id`);