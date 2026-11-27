DELETE FROM `issue`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_issue` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`assignee_id` text,
	`state_id` text NOT NULL,
	`position` text NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_issue_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_issue_assignee_id_member_user_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `member`(`user_id`) ON DELETE SET NULL,
	CONSTRAINT `fk_issue_state_id_workflow_state_id_fk` FOREIGN KEY (`state_id`) REFERENCES `workflow_state`(`id`),
	CONSTRAINT `fk_issue_creator_id_member_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `member`(`user_id`)
);
--> statement-breakpoint
INSERT INTO `__new_issue`(`id`, `project_id`, `number`, `title`, `description`, `assignee_id`, `state_id`, `position`, `creator_id`, `created_at`, `updated_at`) SELECT `id`, `project_id`, `number`, `title`, `description`, `assignee_id`, `state_id`, `position`, `creator_id`, `created_at`, `updated_at` FROM `issue`;--> statement-breakpoint
DROP TABLE `issue`;--> statement-breakpoint
ALTER TABLE `__new_issue` RENAME TO `issue`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_entry` (
	`id` text PRIMARY KEY,
	`issue_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_activity_entry_issue_id_issue_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_activity_entry_actor_id_member_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `member`(`user_id`),
	CONSTRAINT "activity_entry_kind" CHECK("kind" in ('created', 'title_changed', 'state_changed', 'assignee_changed'))
);
--> statement-breakpoint
INSERT INTO `__new_activity_entry`(`id`, `issue_id`, `actor_id`, `kind`, `old_value`, `new_value`, `created_at`) SELECT `id`, `issue_id`, `actor_id`, `kind`, `old_value`, `new_value`, `created_at` FROM `activity_entry`;--> statement-breakpoint
DROP TABLE `activity_entry`;--> statement-breakpoint
ALTER TABLE `__new_activity_entry` RENAME TO `activity_entry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `checklist_item_issue_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `issue_label_label_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `label_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `issue_project_number_unique` ON `issue` (`project_id`,`number`);--> statement-breakpoint
CREATE INDEX `issue_state_position_idx` ON `issue` (`state_id`,`position`);--> statement-breakpoint
CREATE INDEX `issue_assignee_idx` ON `issue` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `activity_entry_issue_idx` ON `activity_entry` (`issue_id`,`created_at`);--> statement-breakpoint
DROP TABLE `checklist_item`;--> statement-breakpoint
DROP TABLE `issue_label`;--> statement-breakpoint
DROP TABLE `label`;