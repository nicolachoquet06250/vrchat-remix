CREATE TABLE `authenticators` (
	`id` varchar(255) NOT NULL,
	`user_id` int NOT NULL,
	`public_key` longblob NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	`device_type` varchar(32) NOT NULL,
	`backed_up` int NOT NULL DEFAULT 0,
	`transports` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `authenticators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `auth_user_idx` ON `authenticators` (`user_id`);