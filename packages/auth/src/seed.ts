import type { Database } from "@helios/db";
import { user } from "@helios/db/schema/auth";
import { member, workspace } from "@helios/db/schema/tracker";

/**
 * Creates the Workspace and its first Admin. Does nothing once the Workspace
 * exists, so a later change of `adminEmail`, or a demoted or deactivated
 * first Admin, is never overwritten.
 */
export const seed = async (db: Database, adminEmail: string) => {
  const existing = await db.select({ id: workspace.id }).from(workspace).get();

  if (existing) {
    return;
  }

  const userId = crypto.randomUUID();
  await db.batch([
    db.insert(workspace).values({ id: 1 }),
    db.insert(user).values({
      id: userId,
      email: adminEmail.toLowerCase(),
      emailVerified: true,
      name: "",
    }),
    db.insert(member).values({ userId, role: "admin" }),
  ]);
};
