import type { Database } from "@helios/db";
import { priorities } from "@helios/db/enums";
import { activityEntry, issue, project } from "@helios/db/schema/tracker";
import { ORPCError } from "@orpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  descriptionSchema,
  filtersSchema,
  formatIdentifier,
  parseIdentifier,
  priorityLabels,
  sortSchema,
  titleSchema,
} from "../domain";
import type { IssueFilters, SortField } from "../domain";
import { memberProcedure } from "../index";
import { displayName, memberWith, toMemberSummary } from "../member";
import {
  compareKeys,
  compareStates,
  found,
  idInput,
  keyAfter,
  placeAfter,
} from "./shared";

const SEARCH_LIMIT = 20;
const MAX_SEARCH_WORDS = 10;

/** D1 rejects LIKE patterns over 50 bytes; a word's first 12 code points, of up to 4 bytes each, plus two `%` fit. */
const firstCodePoints = /^.{0,12}/su;

const rowWith = {
  project: { columns: { id: true, name: true, prefix: true } },
  state: { columns: { id: true, name: true, category: true, position: true } },
  assignee: memberWith,
  labels: { columns: { id: true, name: true, color: true } },
  checklistItems: { columns: { checked: true } },
} as const;

type RowFilter = NonNullable<
  NonNullable<Parameters<Database["query"]["issue"]["findMany"]>[0]>["where"]
>;

const loadRows = async (db: Database, where: RowFilter) => {
  const rows = await db.query.issue.findMany({ where, with: rowWith });

  return rows.map((row) => ({
    id: row.id,
    identifier: formatIdentifier(row.project.prefix, row.number),
    number: row.number,
    title: row.title,
    priority: row.priority,
    position: row.position,
    project: row.project,
    state: row.state,
    assignee: row.assignee ? toMemberSummary(row.assignee) : null,
    labels: row.labels.toSorted((a, b) => a.name.localeCompare(b.name)),
    checklist: {
      done: row.checklistItems.filter((item) => item.checked).length,
      total: row.checklistItems.length,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
};

type IssueRow = Awaited<ReturnType<typeof loadRows>>[number];

const byPriority = (a: IssueRow, b: IssueRow) =>
  priorities.indexOf(a.priority) - priorities.indexOf(b.priority);

const sorters: Record<SortField, (a: IssueRow, b: IssueRow) => number> = {
  identifier: (a, b) => a.number - b.number,
  title: (a, b) => a.title.localeCompare(b.title),
  state: (a, b) => compareStates(a.state, b.state),
  priority: byPriority,
  // Unassigned sorts after every Member.
  assignee: (a, b) =>
    a.assignee === null || b.assignee === null
      ? Number(a.assignee === null) - Number(b.assignee === null)
      : a.assignee.displayName.localeCompare(b.assignee.displayName),
  created: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  updated: (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
};

const projectIssuesWhere = (
  projectId: string,
  filters: IssueFilters
): RowFilter => {
  const assigneeMatches = [
    ...(filters.assigneeIds === undefined
      ? []
      : [{ assigneeId: { in: filters.assigneeIds } }]),
    ...(filters.unassigned === true
      ? [{ assigneeId: { isNull: true as const } }]
      : []),
  ];

  return {
    projectId,
    ...(assigneeMatches.length > 0 && { OR: assigneeMatches }),
    ...(filters.priorities !== undefined && {
      priority: { in: filters.priorities },
    }),
    ...(filters.labelIds !== undefined && {
      labels: { id: { in: filters.labelIds } },
    }),
  };
};

const findIssue = async (db: Database, id: string) =>
  found(
    await db.query.issue.findFirst({
      where: { id },
      with: { state: true, assignee: memberWith },
    }),
    "Issue"
  );

const findStateInProject = async (
  db: Database,
  stateId: string,
  projectId: string
) => {
  const state = await db.query.workflowState.findFirst({
    where: { id: stateId },
  });

  if (state?.projectId !== projectId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Choose a Workflow State of the Issue's Project.",
    });
  }

  return state;
};

/** Only an active Member can be assigned; returns their display name for Activity. */
const activeAssigneeName = async (db: Database, userId: string) => {
  const assignee = await db.query.member.findFirst({
    where: { userId, active: true },
    ...memberWith,
  });

  if (!assignee) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Only an active Member can be assigned.",
    });
  }

  return displayName(assignee.user);
};

const bottomOf = async (db: Database, stateId: string) => {
  const last = await db.query.issue.findFirst({
    columns: { position: true },
    where: { stateId },
    orderBy: { position: "desc" },
  });

  return keyAfter(last?.position);
};

export const issuesRouter = {
  /**
   * Creates an Issue with the Project's next number. It lands at the bottom of
   * `stateId`, or of the Project's first `backlog` state when none is given.
   */
  create: memberProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: titleSchema,
        description: descriptionSchema.optional(),
        priority: z.enum(priorities).optional(),
        assigneeId: z.string().nullable().optional(),
        stateId: z.string().optional(),
      })
    )
    .handler(
      async ({
        context: { db, member: creator },
        input: { projectId, stateId, ...fields },
      }) => {
        const { prefix } = found(
          await db.query.project.findFirst({
            columns: { prefix: true },
            where: { id: projectId },
          }),
          "Project"
        );

        const state =
          stateId === undefined
            ? found(
                await db.query.workflowState.findFirst({
                  where: { projectId, category: "backlog" },
                  orderBy: { position: "asc" },
                }),
                "Backlog Workflow State"
              )
            : await findStateInProject(db, stateId, projectId);

        if (fields.assigneeId !== undefined && fields.assigneeId !== null) {
          await activeAssigneeName(db, fields.assigneeId);
        }

        const id = crypto.randomUUID();
        const position = await bottomOf(db, state.id);

        // One batch: the counter only moves forward, so a number is never handed out twice.
        const [, [created]] = await db.batch([
          db
            .update(project)
            .set({ nextIssueNumber: sql`${project.nextIssueNumber} + 1` })
            .where(eq(project.id, projectId)),
          db
            .insert(issue)
            .values({
              ...fields,
              id,
              projectId,
              stateId: state.id,
              position,
              creatorId: creator.userId,
              number: sql`(select ${project.nextIssueNumber} - 1 from ${project} where ${project.id} = ${projectId})`,
            })
            .returning({ number: issue.number }),
          db.insert(activityEntry).values({
            issueId: id,
            actorId: creator.userId,
            kind: "created",
          }),
        ]);

        const { number } = found(created, "Issue");

        return { id, number, identifier: formatIdentifier(prefix, number) };
      }
    ),

  /**
   * Changes any of the Issue's fields. Title, Workflow State, Priority and
   * assignee changes each record Activity; description changes do not. A new
   * Workflow State puts the Issue at the bottom of that column.
   */
  update: memberProcedure
    .input(
      idInput.extend({
        title: titleSchema.optional(),
        description: descriptionSchema.optional(),
        priority: z.enum(priorities).optional(),
        assigneeId: z.string().nullable().optional(),
        stateId: z.string().optional(),
      })
    )
    .handler(async ({ context: { db, member: actor }, input }) => {
      const current = await findIssue(db, input.id);
      const changes: Partial<typeof issue.$inferInsert> = {};

      const activity: Omit<
        typeof activityEntry.$inferInsert,
        "issueId" | "actorId"
      >[] = [];

      if (input.title !== undefined && input.title !== current.title) {
        changes.title = input.title;
        activity.push({
          kind: "title_changed",
          oldValue: current.title,
          newValue: input.title,
        });
      }

      if (
        input.description !== undefined &&
        input.description !== current.description
      ) {
        changes.description = input.description;
      }

      if (input.priority !== undefined && input.priority !== current.priority) {
        changes.priority = input.priority;
        activity.push({
          kind: "priority_changed",
          oldValue: priorityLabels[current.priority],
          newValue: priorityLabels[input.priority],
        });
      }

      if (
        input.assigneeId !== undefined &&
        input.assigneeId !== current.assigneeId
      ) {
        changes.assigneeId = input.assigneeId;
        activity.push({
          kind: "assignee_changed",
          oldValue: current.assignee
            ? displayName(current.assignee.user)
            : null,
          newValue:
            input.assigneeId === null
              ? null
              : await activeAssigneeName(db, input.assigneeId),
        });
      }

      if (input.stateId !== undefined && input.stateId !== current.stateId) {
        const state = await findStateInProject(
          db,
          input.stateId,
          current.projectId
        );

        changes.stateId = state.id;
        changes.position = await bottomOf(db, state.id);
        activity.push({
          kind: "state_changed",
          oldValue: current.state.name,
          newValue: state.name,
        });
      }

      if (Object.keys(changes).length === 0) {
        return;
      }

      await db.batch([
        db.update(issue).set(changes).where(eq(issue.id, current.id)),
        ...activity.map((entry) =>
          db
            .insert(activityEntry)
            .values({ ...entry, issueId: current.id, actorId: actor.userId })
        ),
      ]);
    }),

  /**
   * Board drag and drop: puts the Issue in `stateId` right after `afterId`
   * (top of the column when null). Records Activity only when the Workflow
   * State changes. A stale `afterId` is a CONFLICT: the client should reload.
   */
  move: memberProcedure
    .input(
      idInput.extend({ stateId: z.string(), afterId: z.string().nullable() })
    )
    .handler(
      async ({
        context: { db, member: actor },
        input: { id, stateId, afterId },
      }) => {
        const current = await findIssue(db, id);

        const [state, siblings] = await Promise.all([
          findStateInProject(db, stateId, current.projectId),
          db.query.issue.findMany({
            columns: { id: true, position: true },
            where: { stateId, id: { ne: id } },
            orderBy: { position: "asc" },
          }),
        ]);

        const position = placeAfter(siblings, afterId);

        if (position === undefined) {
          throw new ORPCError("CONFLICT", {
            message:
              "The board changed while you were moving. Reload and try again.",
          });
        }

        await db.batch([
          db.update(issue).set({ stateId, position }).where(eq(issue.id, id)),
          ...(stateId === current.stateId
            ? []
            : [
                db.insert(activityEntry).values({
                  issueId: id,
                  actorId: actor.userId,
                  kind: "state_changed",
                  oldValue: current.state.name,
                  newValue: state.name,
                }),
              ]),
        ]);
      }
    ),

  /** Deletes the Issue with its Checklist, Comments, Label links and Activity. Its number is not reused. */
  delete: memberProcedure
    .input(idInput)
    .handler(async ({ context: { db }, input: { id } }) => {
      const [deleted] = await db
        .delete(issue)
        .where(eq(issue.id, id))
        .returning({ id: issue.id });

      found(deleted, "Issue");
    }),

  get: memberProcedure
    .input(z.object({ identifier: z.string() }))
    .handler(async ({ context: { db }, input }) => {
      const parsed = parseIdentifier(input.identifier);

      const row =
        parsed &&
        (await db.query.issue.findFirst({
          where: { number: parsed.number, project: { prefix: parsed.prefix } },
          with: {
            project: {
              columns: { id: true, name: true, prefix: true, archivedAt: true },
            },
            state: { columns: { id: true, name: true, category: true } },
            assignee: memberWith,
            creator: memberWith,
            labels: { columns: { id: true, name: true, color: true } },
            checklistItems: {
              columns: { id: true, text: true, checked: true },
              orderBy: { position: "asc" },
            },
            comments: { with: { author: memberWith } },
            activityEntries: { with: { actor: memberWith } },
          },
        }));

      const detail = found(row, "Issue");

      const timeline = [
        ...detail.activityEntries.map((entry) => ({
          type: "activity" as const,
          id: entry.id,
          kind: entry.kind,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          actor: toMemberSummary(entry.actor),
          createdAt: entry.createdAt,
        })),
        ...detail.comments.map((posted) => ({
          type: "comment" as const,
          id: posted.id,
          body: posted.body,
          author: toMemberSummary(posted.author),
          createdAt: posted.createdAt,
          editedAt: posted.editedAt,
        })),
      ].toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return {
        id: detail.id,
        identifier: formatIdentifier(detail.project.prefix, detail.number),
        number: detail.number,
        title: detail.title,
        description: detail.description,
        priority: detail.priority,
        project: detail.project,
        state: detail.state,
        assignee: detail.assignee ? toMemberSummary(detail.assignee) : null,
        creator: toMemberSummary(detail.creator),
        labels: detail.labels.toSorted((a, b) => a.name.localeCompare(b.name)),
        checklist: detail.checklistItems,
        timeline,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      };
    }),

  /** Board data: every Workflow State in column order, each with its matching Issues in manual order. */
  board: memberProcedure
    .input(z.object({ projectId: z.string(), filters: filtersSchema }))
    .handler(async ({ context: { db }, input: { projectId, filters } }) => {
      const [states, rows] = await Promise.all([
        db.query.workflowState.findMany({
          columns: { id: true, name: true, category: true, position: true },
          where: { projectId },
        }),
        loadRows(db, projectIssuesWhere(projectId, filters)),
      ]);

      return states.toSorted(compareStates).map((state) => ({
        state,
        issues: rows
          .filter((row) => row.state.id === state.id)
          .toSorted((a, b) => compareKeys(a.position, b.position)),
      }));
    }),

  /** List data: matching Issues sorted by a field; ties fall back to Identifier. */
  list: memberProcedure
    .input(
      z.object({
        projectId: z.string(),
        filters: filtersSchema,
        sort: sortSchema,
      })
    )
    .handler(
      async ({ context: { db }, input: { projectId, filters, sort } }) => {
        const rows = await loadRows(db, projectIssuesWhere(projectId, filters));
        const sign = sort.direction === "asc" ? 1 : -1;

        return rows.toSorted(
          (a, b) => sign * sorters[sort.field](a, b) || sorters.identifier(a, b)
        );
      }
    ),

  /**
   * My Issues: assigned to the signed-in Member, in active Projects, in
   * `backlog` or `started` states; grouped by Project, sorted by Priority.
   */
  mine: memberProcedure.handler(async ({ context: { db, member: self } }) => {
    const rows = await loadRows(db, {
      assigneeId: self.userId,
      project: { archivedAt: { isNull: true } },
      state: { category: { in: ["backlog", "started"] } },
    });

    return Map.groupBy(
      rows.toSorted(
        (a, b) =>
          a.project.name.localeCompare(b.project.name) ||
          byPriority(a, b) ||
          a.number - b.number
      ),
      (row) => row.project.id
    )
      .values()
      .map((issues) => ({
        project: found(issues[0], "Project").project,
        issues,
      }))
      .toArray();
  }),

  /** Command palette search: an exact Identifier, or every typed word in the title or Identifier of an Issue in an active Project. */
  search: memberProcedure
    .input(z.object({ query: z.string().trim().min(1).max(200) }))
    .handler(async ({ context: { db }, input: { query } }) => {
      const parsed = parseIdentifier(query);
      const exact = parsed && formatIdentifier(parsed.prefix, parsed.number);

      // D1 binds at most 100 parameters, and each word binds up to three.
      const words = [
        ...new Set(
          query
            .split(/\s+/u)
            .map((word) => firstCodePoints.exec(word)?.[0] ?? "")
        ),
      ].slice(0, MAX_SEARCH_WORDS);

      // shortcut: `%` and `_` typed into the palette act as LIKE wildcards; escape them if that ever confuses anyone.
      const wordsMatch: RowFilter = {
        project: { archivedAt: { isNull: true } },
        AND: words.map((word) => ({
          OR: [
            { title: { like: `%${word}%` } },
            { project: { prefix: { like: `%${word}%` } } },
            ...(/^\d+$/u.test(word) ? [{ number: Number(word) }] : []),
          ],
        })),
      };

      const rows = await loadRows(
        db,
        parsed
          ? {
              OR: [
                { number: parsed.number, project: { prefix: parsed.prefix } },
                wordsMatch,
              ],
            }
          : wordsMatch
      );

      return rows
        .toSorted(
          (a, b) =>
            Number(b.identifier === exact) - Number(a.identifier === exact) ||
            b.updatedAt.getTime() - a.updatedAt.getTime()
        )
        .slice(0, SEARCH_LIMIT);
    }),
};
