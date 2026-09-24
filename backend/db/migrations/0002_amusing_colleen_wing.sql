CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `replays` ADD `downloaded_at_s` integer;--> statement-breakpoint
ALTER TABLE `replays` ADD `downloader_puuid` text;