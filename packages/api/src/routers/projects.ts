import type { Database } from "@helios/db";
import { project, workflowState } from "@helios/db/schema/tracker";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { defaultStates, nameSchema, prefixSchema } from "../domain";
import { adminProcedure, memberProcedure } from "../index";
import {
  compareStates,
  found,
  idInput,
  conflictOnDuplicate,
  keyAfter,
} from "./shared";

const projectColumns = {
  id: true,
  name: true,
  prefix: true,
  archivedAt: true,
} as const;

const listProjects = async (db: Database, archived: boolean) =>
  await db.query.project.findMany({
    columns: projectColumns,
    where: { archivedAt: archived ? { isNotNull: true } : { isNull: true } },
    orderBy: { name: "asc" },
  });

const setArchivedAt = async (db: Database, id: string, at: Date | null) => {
  const [updated] = await db
    .update(project)
    .set({ archivedAt: at })
    .where(eq(project.id, id))
    .returning({ id: project.id });

  found(updated, "Project");
};

export const projectsRouter = {
  /** Active Projects, for the sidebar. */
  list: memberProcedure.handler(
    async ({ context: { db } }) => await listProjects(db, false)
  ),

  listArchived: memberProcedure.handler(
    async ({ context: { db } }) => await listProjects(db, true)
  ),

  /** A Project, archived or not, with its Workflow States in board column order. */
  get: memberProcedure
    .input(z.object({ prefix: z.string() }))
    .handler(async ({ context: { db }, input: { prefix } }) => {
      const row = found(
        await db.query.project.findFirst({
          columns: projectColumns,
          where: { prefix: prefix.toUpperCase() },
          with: {
            workflowStates: {
              columns: { id: true, name: true, category: true, position: true },
            },
          },
        }),
        "Project"
      );

      const { workflowStates, ...rest } = row;

      return { ...rest, states: workflowStates.toSorted(compareStates) };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: nameSchema,
        prefix: prefixSchema,
      })
    )
    .handler(async ({ context: { db }, input: { name, prefix } }) => {
      const id = crypto.randomUUID();
      const position = keyAfter(undefined);

      await conflictOnDuplicate(
        async () =>
          await db.batch([
            db.insert(project).values({ id, name, prefix }),
            db.insert(workflowState).values(
              defaultStates.map((state) => ({
                ...state,
                projectId: id,
                position,
              }))
            ),
          ]),
        `The prefix ${prefix} is already used by another Project.`
      );

      return { id, name, prefix };
    }),

  /** The prefix never changes after creation. */
  rename: adminProcedure
    .input(idInput.extend({ name: nameSchema }))
    .handler(async ({ context: { db }, input: { id, name } }) => {
      const [renamed] = await db
        .update(project)
        .set({ name })
        .where(eq(project.id, id))
        .returning({ id: project.id });

      found(renamed, "Project");
    }),

  archive: adminProcedure
    .input(idInput)
    .handler(async ({ context: { db }, input: { id } }) => {
      await setArchivedAt(db, id, new Date());
    }),

  unarchive: adminProcedure
    .input(idInput)
    .handler(async ({ context: { db }, input: { id } }) => {
      await setArchivedAt(db, id, null);
    }),
};
