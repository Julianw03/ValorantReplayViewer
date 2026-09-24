CREATE TABLE `replays` (
	`uuid` text PRIMARY KEY NOT NULL,
	`replay_file_uuid` text,
	`metadata_file_uuid` text,
	FOREIGN KEY (`replay_file_uuid`) REFERENCES `file`(`uuid`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`metadata_file_uuid`) REFERENCES `file`(`uuid`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `file` (
	`uuid` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`mtime` integer NOT NULL,
	`sha256` text NOT NULL,
	CONSTRAINT "path_non_empty" CHECK(length(trim(path)) > 0),
	CONSTRAINT "size_positive" CHECK(size_bytes>= 0),
	CONSTRAINT "sha256_expected_size" CHECK(length(sha256) = 64)
);
--> statement-breakpoint
CREATE TABLE `replay_tags` (
	`replay_uuid` text NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`replay_uuid`, `tag_id`),
	FOREIGN KEY (`replay_uuid`) REFERENCES `replays`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `replay_tags_tag_id_idx` ON `replay_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color_hex` text DEFAULT '#AFAFAF' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `replayCustomizableData` (
	`replay_uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`replay_uuid`) REFERENCES `replays`(`uuid`) ON UPDATE no action ON DELETE cascade
);
