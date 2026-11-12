import type { Database } from "@helios/db";
import {
  activityEntry,
  issue,
  stateCategories,
  workflowState,
} from "@helios/db/schema/tracker";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../index";
import {
  batchAll,
  found,
  idInput,
  keyAfter,
  nameSchema,
  placeAfter,
} from "./shared";

const STATE = "Workflow State";

const findState = async (db: Database, id: string) =>
  found(await db.query.workflowState.findFirst({ where: { id } }), STATE);

/** States of one category in one Project, in position order. */
const categoryStates = async (
  db: Database,
  state: { projectId: string; category: (typeof stateCategories)[number] }
) =>
  await db.query.workflowState.findMany({
    columns: { id: true, position: true },
    where: { projectId: state.projectId, category: state.category },
    orderBy: { position: "asc" },
  });

export const workflowStatesRouter = {
  /** Adds a Workflow State at the end of its State Category. */
  add: adminProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: nameSchema,
        category: z.enum(stateCategories),
      })
    )
    .handler(async ({ context: { db }, input }) => {
      found(
        await db.query.project.findFirst({ where: { id: input.projectId } }),
        "Project"
      );
      const siblings = await categoryStates(db, input);

      const [added] = await db
        .insert(workflowState)
        .values({ ...input, position: keyAfter(siblings.at(-1)?.position) })
        .returning({ id: workflowState.id });

      return found(added, STATE);
    }),

  rename: adminProcedure
    .input(idInput.extend({ name: nameSchema }))
    .handler(async ({ context: { db }, input: { id, name } }) => {
      const [renamed] = await db
        .update(workflowState)
        .set({ name })
        .where(eq(workflowState.id, id))
        .returning({ id: workflowState.id });

      found(renamed, STATE);
    }),

  /**
   * Places a Workflow State right after `afterId` (or first, when null) inside
   * its own State Category; categories themselves keep their fixed order.
   */
  move: adminProcedure
    .input(idInput.extend({ afterId: z.string().nullable() }))
    .handler(async ({ context: { db }, input: { id, afterId } }) => {
      const state = await findState(db, id);

      const states = await categoryStates(db, state);
      const siblings = states.filter((sibling) => sibling.id !== id);

      const position = placeAfter(siblings, afterId);

      if (position === undefined) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "A Workflow State can only move among states of its own State Category.",
        });
      }

      await db
        .update(workflowState)
        .set({ position })
        .where(eq(workflowState.id, id));
    }),

  /**
   * Deletes a Workflow State after moving its Issues to the end of
   * `destinationId`, recording a state change on each, all in one batch.
   */
  delete: adminProcedure
    .input(idInput.extend({ destinationId: z.string() }))
    .handler(
      async ({
        context: { db, member: admin },
        input: { id, destinationId },
      }) => {
        const [state, destination] = await Promise.all([
          findState(db, id),
          findState(db, destinationId),
        ]);

        if (
          destination.id === id ||
          destination.projectId !== state.projectId
        ) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Choose another Workflow State of the same Project.",
          });
        }

        if (state.category === "backlog") {
          const backlogStates = await categoryStates(db, state);

          if (backlogStates.length === 1) {
            throw new ORPCError("CONFLICT", {
              message:
                "A Project needs at least one backlog Workflow State for new Issues.",
            });
          }
        }

        const [moving, destinationIssues] = await db.batch([
          db.query.issue.findMany({
            columns: { id: true },
            where: { stateId: id },
            orderBy: { position: "asc" },
          }),
          db.query.issue.findMany({
            columns: { position: true },
            where: { stateId: destinationId },
            orderBy: { position: "desc" },
            limit: 1,
          }),
        ]);

        let position = destinationIssues[0]?.position;

        await batchAll(db, [
          ...moving.flatMap((moved) => {
            position = keyAfter(position);

            return [
              db
                .update(issue)
                .set({ stateId: destinationId, position })
                .where(eq(issue.id, moved.id)),
              db.insert(activityEntry).values({
                issueId: moved.id,
                actorId: admin.userId,
                kind: "state_changed",
                oldValue: state.name,
                newValue: destination.name,
              }),
            ];
          }),
          db.delete(workflowState).where(eq(workflowState.id, id)),
        ]);
      }
    ),
};
