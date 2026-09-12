CREATE TABLE `fiches` (
	`numero` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'brouillon' NOT NULL,
	`payload` text,
	`theme` text,
	`category` text,
	`prompt_version` text,
	`validated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fiche_numero` integer NOT NULL,
	`path` text NOT NULL,
	`retenue` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`fiche_numero`) REFERENCES `fiches`(`numero`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lexique` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mot` text NOT NULL,
	`definition` text,
	`exemple` text,
	`statut` text DEFAULT 'nouveau' NOT NULL,
	`occurrences` integer DEFAULT 0 NOT NULL,
	`last_seen_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lexique_mot_unique` ON `lexique` (`mot`);