CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`query` varchar(200) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`),
	CONSTRAINT `ss_user_type_query_unique` UNIQUE(`user_id`,`type`,`query`)
);
--> statement-breakpoint
CREATE INDEX `ss_user_idx` ON `saved_searches` (`user_id`);