CREATE TABLE `activity_entry` (
	`id` text PRIMARY KEY,
	`issue_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_activity_entry_issue_id_issue_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_activity_entry_actor_id_member_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `member`(`user_id`),
	CONSTRAINT "activity_entry_kind" CHECK("kind" in ('created', 'title_changed', 'state_changed', 'priority_changed', 'assignee_changed', 'label_added', 'label_removed'))
);
--> statement-breakpoint
CREATE TABLE `checklist_item` (
	`id` text PRIMARY KEY,
	`issue_id` text NOT NULL,
	`text` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`position` text NOT NULL,
	CONSTRAINT `fk_checklist_item_issue_id_issue_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY,
	`issue_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`edited_at` integer,
	CONSTRAINT `fk_comment_issue_id_issue_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_comment_author_id_member_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `member`(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL UNIQUE,
	`invited_by_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_invitation_invited_by_id_member_user_id_fk` FOREIGN KEY (`invited_by_id`) REFERENCES `member`(`user_id`),
	CONSTRAINT "invitation_status" CHECK("status" in ('pending', 'accepted', 'revoked')),
	CONSTRAINT "invitation_email_lowercase" CHECK("email" = lower("email"))
);
--> statement-breakpoint
CREATE TABLE `issue` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'none' NOT NULL,
	`assignee_id` text,
	`state_id` text NOT NULL,
	`position` text NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_issue_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_issue_assignee_id_member_user_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `member`(`user_id`) ON DELETE SET NULL,
	CONSTRAINT `fk_issue_state_id_workflow_state_id_fk` FOREIGN KEY (`state_id`) REFERENCES `workflow_state`(`id`),
	CONSTRAINT `fk_issue_creator_id_member_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `member`(`user_id`),
	CONSTRAINT "issue_priority" CHECK("priority" in ('urgent', 'high', 'medium', 'low', 'none'))
);
--> statement-breakpoint
CREATE TABLE `issue_label` (
	`issue_id` text NOT NULL,
	`label_id` text NOT NULL,
	CONSTRAINT `issue_label_pk` PRIMARY KEY(`issue_id`, `label_id`),
	CONSTRAINT `fk_issue_label_issue_id_issue_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issue`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_issue_label_label_id_label_id_fk` FOREIGN KEY (`label_id`) REFERENCES `label`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `label` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `member` (
	`user_id` text PRIMARY KEY,
	`role` text DEFAULT 'member' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT "member_role" CHECK("role" in ('admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`prefix` text NOT NULL UNIQUE,
	`next_issue_number` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "project_prefix_format" CHECK(length("prefix") between 2 and 5 and "prefix" not glob '*[^A-Z]*')
);
--> statement-breakpoint
CREATE TABLE `workflow_state` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`position` text NOT NULL,
	CONSTRAINT `fk_workflow_state_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE,
	CONSTRAINT "workflow_state_category" CHECK("category" in ('ideas', 'backlog', 'started', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` integer PRIMARY KEY DEFAULT 1,
	`name` text DEFAULT 'Helios' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "workspace_singleton" CHECK("id" = 1)
);
--> statement-breakpoint
CREATE INDEX `activity_entry_issue_idx` ON `activity_entry` (`issue_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `checklist_item_issue_idx` ON `checklist_item` (`issue_id`,`position`);--> statement-breakpoint
CREATE INDEX `comment_issue_idx` ON `comment` (`issue_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `issue_project_number_unique` ON `issue` (`project_id`,`number`);--> statement-breakpoint
CREATE INDEX `issue_state_position_idx` ON `issue` (`state_id`,`position`);--> statement-breakpoint
CREATE INDEX `issue_assignee_idx` ON `issue` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `issue_label_label_idx` ON `issue_label` (`label_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_name_unique` ON `label` (lower("name"));--> statement-breakpoint
CREATE INDEX `workflow_state_project_idx` ON `workflow_state` (`project_id`,`category`,`position`);