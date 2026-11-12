import { defineRelationsPart, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

/** Board order: columns sort by category first, then by position inside it. */
export const stateCategories = [
  "ideas",
  "backlog",
  "started",
  "completed",
  "cancelled",
] as const;

export type StateCategory = (typeof stateCategories)[number];

/** Most urgent first; `none` sorts last. */
export const priorities = ["urgent", "high", "medium", "low", "none"] as const;

export type Priority = (typeof priorities)[number];

export const memberRoles = ["admin", "member"] as const;

export type MemberRole = (typeof memberRoles)[number];

export const invitationStatuses = ["pending", "accepted", "revoked"] as const;

export type InvitationStatus = (typeof invitationStatuses)[number];

export const activityKinds = [
  "created",
  "title_changed",
  "state_changed",
  "priority_changed",
  "assignee_changed",
  "label_added",
  "label_removed",
] as const;

export type ActivityKind = (typeof activityKinds)[number];

const oneOf = (column: AnySQLiteColumn, values: readonly string[]): SQL => {
  const quoted = values.map((value) => `'${value}'`).join(", ");

  return sql`${column} in (${sql.raw(quoted)})`;
};

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

/**
 * Fractional index key (see the `fractional-indexing` package). Keys compare
 * correctly as plain strings, so a move rewrites only the moved row.
 */
const position = () => text("position").notNull();

export const workspace = sqliteTable(
  "workspace",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull().default("Helios"),
    createdAt: createdAt(),
  },
  (table) => [check("workspace_singleton", sql`${table.id} = 1`)]
);

export const member = sqliteTable(
  "member",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: memberRoles }).notNull().default("member"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [check("member_role", oneOf(table.role, memberRoles))]
);

export const invitation = sqliteTable(
  "invitation",
  {
    id: id(),
    email: text("email").notNull().unique(),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => member.userId),
    status: text("status", { enum: invitationStatuses })
      .notNull()
      .default("pending"),
    createdAt: createdAt(),
  },
  (table) => [
    check("invitation_status", oneOf(table.status, invitationStatuses)),
    check(
      "invitation_email_lowercase",
      sql`${table.email} = lower(${table.email})`
    ),
  ]
);

export const project = sqliteTable(
  "project",
  {
    id: id(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull().unique(),
    nextIssueNumber: integer("next_issue_number").notNull().default(1),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "project_prefix_format",
      sql`length(${table.prefix}) between 2 and 5 and ${table.prefix} not glob '*[^A-Z]*'`
    ),
  ]
);

export const workflowState = sqliteTable(
  "workflow_state",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", { enum: stateCategories }).notNull(),
    position: position(),
  },
  (table) => [
    check("workflow_state_category", oneOf(table.category, stateCategories)),
    index("workflow_state_project_idx").on(
      table.projectId,
      table.category,
      table.position
    ),
  ]
);

export const issue = sqliteTable(
  "issue",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priority: text("priority", { enum: priorities }).notNull().default("none"),
    assigneeId: text("assignee_id").references(() => member.userId, {
      onDelete: "set null",
    }),
    stateId: text("state_id")
      .notNull()
      .references(() => workflowState.id),
    position: position(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => member.userId),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("issue_priority", oneOf(table.priority, priorities)),
    uniqueIndex("issue_project_number_unique").on(
      table.projectId,
      table.number
    ),
    index("issue_state_position_idx").on(table.stateId, table.position),
    index("issue_assignee_idx").on(table.assigneeId),
  ]
);

export const label = sqliteTable(
  "label",
  {
    id: id(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("label_name_unique").on(sql`lower(${table.name})`)]
);

export const issueLabel = sqliteTable(
  "issue_label",
  {
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.labelId] }),
    index("issue_label_label_idx").on(table.labelId),
  ]
);

export const checklistItem = sqliteTable(
  "checklist_item",
  {
    id: id(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    checked: integer("checked", { mode: "boolean" }).notNull().default(false),
    position: position(),
  },
  (table) => [
    index("checklist_item_issue_idx").on(table.issueId, table.position),
  ]
);

export const comment = sqliteTable(
  "comment",
  {
    id: id(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => member.userId),
    body: text("body").notNull(),
    createdAt: createdAt(),
    /** Set on the first edit; a non-null value marks the Comment as edited. */
    editedAt: integer("edited_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("comment_issue_idx").on(table.issueId, table.createdAt)]
);

/** Values are display strings captured at write time, so renames and deletions keep history readable. */
export const activityEntry = sqliteTable(
  "activity_entry",
  {
    id: id(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => member.userId),
    kind: text("kind", { enum: activityKinds }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: createdAt(),
  },
  (table) => [
    check("activity_entry_kind", oneOf(table.kind, activityKinds)),
    index("activity_entry_issue_idx").on(table.issueId, table.createdAt),
  ]
);

export const trackerRelations = defineRelationsPart(
  {
    user,
    member,
    invitation,
    project,
    workflowState,
    issue,
    label,
    issueLabel,
    checklistItem,
    comment,
    activityEntry,
  },
  (r) => ({
    member: {
      user: r.one.user({
        from: r.member.userId,
        to: r.user.id,
        optional: false,
      }),
    },
    invitation: {
      invitedBy: r.one.member({
        from: r.invitation.invitedById,
        to: r.member.userId,
        optional: false,
      }),
    },
    project: {
      workflowStates: r.many.workflowState(),
      issues: r.many.issue(),
    },
    workflowState: {
      project: r.one.project({
        from: r.workflowState.projectId,
        to: r.project.id,
        optional: false,
      }),
      issues: r.many.issue(),
    },
    issue: {
      project: r.one.project({
        from: r.issue.projectId,
        to: r.project.id,
        optional: false,
      }),
      state: r.one.workflowState({
        from: r.issue.stateId,
        to: r.workflowState.id,
        optional: false,
      }),
      assignee: r.one.member({
        from: r.issue.assigneeId,
        to: r.member.userId,
        alias: "assignee",
      }),
      creator: r.one.member({
        from: r.issue.creatorId,
        to: r.member.userId,
        optional: false,
        alias: "creator",
      }),
      labels: r.many.label({
        from: r.issue.id.through(r.issueLabel.issueId),
        to: r.label.id.through(r.issueLabel.labelId),
      }),
      checklistItems: r.many.checklistItem(),
      comments: r.many.comment(),
      activityEntries: r.many.activityEntry(),
    },
    checklistItem: {
      issue: r.one.issue({
        from: r.checklistItem.issueId,
        to: r.issue.id,
        optional: false,
      }),
    },
    comment: {
      issue: r.one.issue({
        from: r.comment.issueId,
        to: r.issue.id,
        optional: false,
      }),
      author: r.one.member({
        from: r.comment.authorId,
        to: r.member.userId,
        optional: false,
      }),
    },
    activityEntry: {
      issue: r.one.issue({
        from: r.activityEntry.issueId,
        to: r.issue.id,
        optional: false,
      }),
      actor: r.one.member({
        from: r.activityEntry.actorId,
        to: r.member.userId,
        optional: false,
      }),
    },
  })
);
