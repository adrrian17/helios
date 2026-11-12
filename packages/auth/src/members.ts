import type { Database } from "@helios/db";
import { session, user } from "@helios/db/schema/auth";
import { invitation, member } from "@helios/db/schema/tracker";
import { and, eq, sql } from "drizzle-orm";

/** An active Member or a pending Invitation may receive a magic link. */
export const canReceiveMagicLink = async (db: Database, email: string) => {
  const normalized = email.toLowerCase();

  const [activeMembers, pendingInvitations] = await db.batch([
    db
      .select({ userId: member.userId })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(eq(user.email, normalized), eq(member.active, true))),
    db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(eq(invitation.email, normalized), eq(invitation.status, "pending"))
      ),
  ]);

  return activeMembers.length > 0 || pendingInvitations.length > 0;
};

/**
 * Decides whether a user may get a session. An existing Member gets one only
 * while active; a pending Invitation becomes a Member here, on first sign-in.
 */
export const admitMember = async (db: Database, userId: string) => {
  const found = await db
    .select({ email: user.email, active: member.active })
    .from(user)
    .leftJoin(member, eq(member.userId, user.id))
    .where(eq(user.id, userId))
    .get();

  if (!found) {
    return false;
  }

  if (found.active !== null) {
    return found.active;
  }

  const pending = and(
    eq(invitation.email, found.email),
    eq(invitation.status, "pending")
  );

  // One batch so the Member row and the accepted Invitation land together, and
  // only if the Invitation is still pending at that moment.
  const [admitted] = await db.batch([
    db
      .insert(member)
      .select(
        db
          .select({ userId: sql<string>`${userId}`.as("user_id") })
          .from(invitation)
          .where(pending)
      )
      .returning({ userId: member.userId }),
    db.update(invitation).set({ status: "accepted" }).where(pending),
  ]);

  return admitted.length > 0;
};

/** Deactivates a Member and ends every session they hold. */
export const deactivateMember = async (db: Database, userId: string) => {
  await db.batch([
    db.update(member).set({ active: false }).where(eq(member.userId, userId)),
    db.delete(session).where(eq(session.userId, userId)),
  ]);
};
