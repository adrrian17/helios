import { activityEntry, issueLabel, label } from "@helios/db/schema/tracker";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { nameSchema } from "../domain";
import { memberProcedure } from "../index";
import { conflictOnDuplicate, found, idInput } from "./shared";

const colorSchema = z
  .string()
  .regex(/^#[\dA-Fa-f]{6}$/u, "Use a hex colour such as #3b82f6.");

const linkInput = z.object({ issueId: z.string(), labelId: z.string() });

const nameTaken = (name: string | undefined) =>
  `A Label named "${name ?? ""}" already exists.`;

export const labelsRouter = {
  list: memberProcedure.handler(async ({ context: { db } }) => {
    const labels = await db.query.label.findMany({
      columns: { id: true, name: true, color: true },
    });

    return labels.toSorted((a, b) => a.name.localeCompare(b.name));
  }),

  /** Label names are unique ignoring case. */
  create: memberProcedure
    .input(z.object({ name: nameSchema, color: colorSchema }))
    .handler(async ({ context: { db }, input }) => {
      const [created] = await conflictOnDuplicate(
        async () =>
          await db
            .insert(label)
            .values(input)
            .returning({ id: label.id, name: label.name, color: label.color }),
        nameTaken(input.name)
      );

      return found(created, "Label");
    }),

  update: memberProcedure
    .input(
      idInput.extend({
        name: nameSchema.optional(),
        color: colorSchema.optional(),
      })
    )
    .handler(async ({ context: { db }, input: { id, ...changes } }) => {
      const [updated] = await conflictOnDuplicate(
        async () =>
          await db
            .update(label)
            .set(changes)
            .where(eq(label.id, id))
            .returning({ id: label.id }),
        nameTaken(changes.name)
      );

      found(updated, "Label");
    }),

  /** Deletes a Label and removes it from every Issue. */
  delete: memberProcedure
    .input(idInput)
    .handler(async ({ context: { db }, input: { id } }) => {
      const [deleted] = await db
        .delete(label)
        .where(eq(label.id, id))
        .returning({ id: label.id });

      found(deleted, "Label");
    }),

  /** Attaches a Label to an Issue and records it in Activity; attaching twice changes nothing. */
  attach: memberProcedure
    .input(linkInput)
    .handler(async ({ context: { db, member: actor }, input }) => {
      const [issue, attached, existing] = await db.batch([
        db.query.issue.findFirst({
          columns: { id: true },
          where: { id: input.issueId },
        }),
        db.query.label.findFirst({ where: { id: input.labelId } }),
        db.query.issueLabel.findFirst({ where: input }),
      ]);

      found(issue, "Issue");
      const { name } = found(attached, "Label");

      if (existing) {
        return;
      }

      await db.batch([
        db.insert(issueLabel).values(input),
        db.insert(activityEntry).values({
          issueId: input.issueId,
          actorId: actor.userId,
          kind: "label_added",
          newValue: name,
        }),
      ]);
    }),

  /** Detaches a Label from an Issue and records it in Activity; detaching twice changes nothing. */
  detach: memberProcedure
    .input(linkInput)
    .handler(async ({ context: { db, member: actor }, input }) => {
      const linked = and(
        eq(issueLabel.issueId, input.issueId),
        eq(issueLabel.labelId, input.labelId)
      );

      const link = await db
        .select({ name: label.name })
        .from(issueLabel)
        .innerJoin(label, eq(label.id, issueLabel.labelId))
        .where(linked)
        .get();

      if (!link) {
        return;
      }

      await db.batch([
        db.delete(issueLabel).where(linked),
        db.insert(activityEntry).values({
          issueId: input.issueId,
          actorId: actor.userId,
          kind: "label_removed",
          oldValue: link.name,
        }),
      ]);
    }),
};
