ALTER TABLE `replays` ADD `imported_at_s` integer NOT NULL;--> statement-breakpoint
CREATE INDEX `replays_imported_at_idx` ON `replays` (`imported_at_s`);--> statement-breakpoint
ALTER TABLE `replayCustomizableData` ADD `notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);