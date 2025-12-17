CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` int,
	`is_authenticated` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `dl_project_idx` ON `downloads` (`project_id`);--> statement-breakpoint
CREATE INDEX `dl_user_idx` ON `downloads` (`user_id`);--> statement-breakpoint
CREATE INDEX `dl_created_idx` ON `downloads` (`created_at`);