CREATE TABLE `captain_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_hash` text NOT NULL,
	`name` text NOT NULL,
	`avatar` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `match_captains` (
	`match_id` text NOT NULL,
	`captain_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar` integer DEFAULT 0 NOT NULL,
	`team` integer NOT NULL,
	`result` text NOT NULL,
	`runs` integer NOT NULL,
	`wickets` integer NOT NULL,
	`fours` integer NOT NULL,
	`sixes` integer NOT NULL,
	`balls` integer NOT NULL,
	`bowling_balls` integer NOT NULL,
	`runs_conceded` integer NOT NULL,
	PRIMARY KEY(`match_id`, `captain_id`)
);
--> statement-breakpoint
CREATE INDEX `match_captains_captain_idx` ON `match_captains` (`captain_id`);--> statement-breakpoint
CREATE TABLE `saved_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text,
	`mode` text NOT NULL,
	`completed_at` integer NOT NULL,
	`summary` text NOT NULL,
	`listing` text NOT NULL
);
