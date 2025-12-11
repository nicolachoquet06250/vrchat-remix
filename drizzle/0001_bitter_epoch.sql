CREATE TABLE `project_images` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_type` varchar(100) NOT NULL,
	`file_size` int NOT NULL,
	`file_data` longblob,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `project_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `project_images_project_idx` ON `project_images` (`project_id`);