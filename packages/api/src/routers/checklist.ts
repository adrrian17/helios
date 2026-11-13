import type { Database } from "@helios/db";
import { checklistItem } from "@helios/db/schema/tracker";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { checklistItemSchema } from "../domain";
import { memberProcedure } from "../index";
import { found, idInput, keyAfter, placeAfter, requireIssue } from "./shared";

const ITEM = "Checklist item";

const itemsOf = async (db: Database, issueId: string) =>
  await db.query.checklistItem.findMany({
    columns: { id: true, position: true },
    where: { issueId },
    orderBy: { position: "asc" },
  });

/** Checklist changes never record Activity. */
export const checklistRouter = {
  add: memberProcedure
    .input(z.object({ issueId: z.string(), text: checklistItemSchema }))
    .handler(async ({ context: { db }, input: { issueId, text } }) => {
      await requireIssue(db, issueId);
      const items = await itemsOf(db, issueId);

      const [added] = await db
        .insert(checklistItem)
        .values({ issueId, text, position: keyAfter(items.at(-1)?.position) })
        .returning({ id: checklistItem.id });

      return found(added, ITEM);
    }),

  update: memberProcedure
    .input(
      idInput.extend({
        text: checklistItemSchema.optional(),
        checked: z.boolean().optional(),
      })
    )
    .handler(async ({ context: { db }, input: { id, ...changes } }) => {
      const [updated] = await db
        .update(checklistItem)
        .set(changes)
        .where(eq(checklistItem.id, id))
        .returning({ id: checklistItem.id });

      found(updated, ITEM);
    }),

  /** Places an item right after `afterId` (or first, when null). */
  move: memberProcedure
    .input(idInput.extend({ afterId: z.string().nullable() }))
    .handler(async ({ context: { db }, input: { id, afterId } }) => {
      const item = found(
        await db.query.checklistItem.findFirst({ where: { id } }),
        ITEM
      );

      const items = await itemsOf(db, item.issueId);
      const siblings = items.filter((sibling) => sibling.id !== id);

      const position = placeAfter(siblings, afterId);

      if (position === undefined) {
        throw new ORPCError("CONFLICT", {
          message: "The Checklist changed. Reload and try again.",
        });
      }

      await db
        .update(checklistItem)
        .set({ position })
        .where(eq(checklistItem.id, id));
    }),

  delete: memberProcedure
    .input(idInput)
    .handler(async ({ context: { db }, input: { id } }) => {
      const [deleted] = await db
        .delete(checklistItem)
        .where(eq(checklistItem.id, id))
        .returning({ id: checklistItem.id });

      found(deleted, ITEM);
    }),
};
