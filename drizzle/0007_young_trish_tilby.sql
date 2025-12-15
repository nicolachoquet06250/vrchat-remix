CREATE TABLE `project_favorites` (
	`user_id` int NOT NULL,
	`project_id` int NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `project_fav_user_project_unique` UNIQUE(`user_id`,`project_id`)
);
--> statement-breakpoint
CREATE INDEX `pf_user_idx` ON `project_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `pf_project_idx` ON `project_favorites` (`project_id`);