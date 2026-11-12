import type { Database } from "@helios/db";
import { comment } from "@helios/db/schema/tracker";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { memberProcedure } from "../index";
import { found, idInput } from "./shared";

const bodySchema = z.string().trim().min(1).max(50_000);

const findComment = async (db: Database, id: string) =>
  found(await db.query.comment.findFirst({ where: { id } }), "Comment");

export const commentsRouter = {
  /** Adds a Markdown Comment by the signed-in Member. */
  add: memberProcedure
    .input(z.object({ issueId: z.string(), body: bodySchema }))
    .handler(async ({ context: { db, member: author }, input }) => {
      found(
        await db.query.issue.findFirst({
          columns: { id: true },
          where: { id: input.issueId },
        }),
        "Issue"
      );

      const [added] = await db
        .insert(comment)
        .values({ ...input, authorId: author.userId })
        .returning({ id: comment.id });

      return found(added, "Comment");
    }),

  /** Only the author may edit a Comment; the edit marks it as edited. */
  edit: memberProcedure
    .input(idInput.extend({ body: bodySchema }))
    .handler(async ({ context: { db, member: self }, input: { id, body } }) => {
      const existing = await findComment(db, id);

      if (existing.authorId !== self.userId) {
        throw new ORPCError("FORBIDDEN", {
          message: "You can only edit your own Comments.",
        });
      }

      await db
        .update(comment)
        .set({ body, editedAt: new Date() })
        .where(eq(comment.id, id));
    }),

  /** The author may delete their Comment; an Admin may delete any. */
  delete: memberProcedure
    .input(idInput)
    .handler(async ({ context: { db, member: self }, input: { id } }) => {
      const existing = await findComment(db, id);

      if (existing.authorId !== self.userId && self.role !== "admin") {
        throw new ORPCError("FORBIDDEN", {
          message: "You can only delete your own Comments.",
        });
      }

      await db.delete(comment).where(eq(comment.id, id));
    }),
};
