import { deactivateMember } from "@helios/auth/members";
import type { Database } from "@helios/db";
import { user } from "@helios/db/schema/auth";
import { invitation, member, memberRoles } from "@helios/db/schema/tracker";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, memberProcedure } from "../index";
import { displayName, found, idInput, toMemberSummary } from "./shared";

const memberInput = z.object({ memberId: z.string() });

const findMember = async (db: Database, userId: string) =>
  found(await db.query.member.findFirst({ where: { userId } }), "Member");

/**
 * Refuses a change that would leave no active Admin. Only matters when the
 * target is itself an active Admin.
 */
const keepAnActiveAdmin = async (db: Database, userId: string) => {
  const target = await findMember(db, userId);

  if (target.role !== "admin" || !target.active) {
    return;
  }

  const otherAdmin = await db.query.member.findFirst({
    where: { role: "admin", active: true, userId: { ne: userId } },
  });

  if (!otherAdmin) {
    throw new ORPCError("CONFLICT", {
      message: "The Workspace needs at least one active Admin.",
    });
  }
};

export const workspaceRouter = {
  /** Every Member, active or not; any Member may read it (for example to pick an assignee). */
  members: memberProcedure.handler(async ({ context: { db } }) => {
    const members = await db.query.member.findMany({
      with: { user: { columns: { name: true, email: true } } },
    });

    return members
      .map((row) => ({ ...toMemberSummary(row), role: row.role }))
      .toSorted((a, b) => a.displayName.localeCompare(b.displayName));
  }),

  invitations: adminProcedure.handler(async ({ context: { db } }) => {
    const pending = await db.query.invitation.findMany({
      where: { status: "pending" },
      with: { invitedBy: { with: { user: true } } },
      orderBy: { createdAt: "asc" },
    });

    return pending.map((row) => ({
      id: row.id,
      email: row.email,
      invitedBy: displayName(row.invitedBy.user),
      createdAt: row.createdAt,
    }));
  }),

  invite: adminProcedure
    .input(z.object({ email: z.email().transform((v) => v.toLowerCase()) }))
    .handler(async ({ context: { db, member: admin }, input: { email } }) => {
      const existingMember = await db
        .select({ userId: member.userId })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(eq(user.email, email))
        .get();

      if (existingMember) {
        throw new ORPCError("CONFLICT", {
          message: `${email} is already a Member.`,
        });
      }

      const existing = await db.query.invitation.findFirst({
        where: { email },
      });

      if (existing?.status === "pending") {
        throw new ORPCError("CONFLICT", {
          message: `${email} is already invited.`,
        });
      }

      const [invited] = await db
        .insert(invitation)
        .values({ email, invitedById: admin.userId })
        .onConflictDoUpdate({
          target: invitation.email,
          set: { status: "pending", invitedById: admin.userId },
        })
        .returning({ id: invitation.id, email: invitation.email });

      return found(invited, "Invitation");
    }),

  revokeInvitation: adminProcedure
    .input(idInput)
    .handler(async ({ context: { db }, input: { id } }) => {
      const [revoked] = await db
        .update(invitation)
        .set({ status: "revoked" })
        .where(and(eq(invitation.id, id), eq(invitation.status, "pending")))
        .returning({ id: invitation.id });

      found(revoked, "Pending Invitation");
    }),

  /** Ends the Member's sessions at once; they stay visible as authors and past assignees. */
  deactivate: adminProcedure
    .input(memberInput)
    .handler(async ({ context: { db }, input: { memberId } }) => {
      await keepAnActiveAdmin(db, memberId);
      await deactivateMember(db, memberId);
    }),

  reactivate: adminProcedure
    .input(memberInput)
    .handler(async ({ context: { db }, input: { memberId } }) => {
      await findMember(db, memberId);
      await db
        .update(member)
        .set({ active: true })
        .where(eq(member.userId, memberId));
    }),

  /** Promotes to or demotes from Admin. */
  setRole: adminProcedure
    .input(memberInput.extend({ role: z.enum(memberRoles) }))
    .handler(async ({ context: { db }, input: { memberId, role } }) => {
      await (role === "member"
        ? keepAnActiveAdmin(db, memberId)
        : findMember(db, memberId));

      await db.update(member).set({ role }).where(eq(member.userId, memberId));
    }),

  /** Sets the signed-in Member's own display name. */
  setDisplayName: memberProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .handler(async ({ context: { db, member: self }, input: { name } }) => {
      await db.update(user).set({ name }).where(eq(user.id, self.userId));
    }),
};
