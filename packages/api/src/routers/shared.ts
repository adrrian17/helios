import type { Database } from "@helios/db";
import { stateCategories } from "@helios/db/schema/tracker";
import type { StateCategory } from "@helios/db/schema/tracker";
import { ORPCError } from "@orpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { z } from "zod";

export const idInput = z.object({ id: z.string() });

export const nameSchema = z.string().trim().min(1).max(120);

/** Returns `value`, or throws NOT_FOUND naming `what`. */
export const found = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) {
    throw new ORPCError("NOT_FOUND", { message: `${what} not found.` });
  }

  return value;
};

/** Runs a write, turning a UNIQUE index violation into a CONFLICT with `message`. */
export const conflictOnDuplicate = async <T>(
  write: () => Promise<T>,
  message: string
) => {
  try {
    return await write();
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed/u.test(
        `${error.message} ${String(error.cause)}`
      )
    ) {
      throw new ORPCError("CONFLICT", { message });
    }

    throw error;
  }
};

type BatchItem = Parameters<Database["batch"]>[0][number];

/** `db.batch` for a statement list whose length is only known at run time. */
export const batchAll = async (db: Database, statements: BatchItem[]) => {
  const [first, ...rest] = statements;

  if (first !== undefined) {
    await db.batch([first, ...rest]);
  }
};

/** Position keys compare by code unit, as SQLite's default BINARY collation does. */
export const compareKeys = (a: string, b: string) => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

interface Sibling {
  id: string;
  position: string;
}

/**
 * Position key for an item placed right after `afterId` (or first, when null)
 * among `siblings`, which are sorted by position and exclude the moved item.
 * Returns undefined when `afterId` is not one of them.
 */
export const placeAfter = (siblings: Sibling[], afterId: string | null) => {
  const index =
    afterId === null
      ? -1
      : siblings.findIndex((sibling) => sibling.id === afterId);

  return afterId !== null && index === -1
    ? undefined
    : generateKeyBetween(
        siblings[index]?.position ?? null,
        siblings[index + 1]?.position ?? null
      );
};

/** A position key after `last`, or the first key when there is none. */
export const keyAfter = (last: string | undefined) =>
  generateKeyBetween(last ?? null, null);

/** Board column order: State Category order first, then position inside the category. */
export const compareStates = (
  a: { category: StateCategory; position: string },
  b: { category: StateCategory; position: string }
) =>
  stateCategories.indexOf(a.category) - stateCategories.indexOf(b.category) ||
  compareKeys(a.position, b.position);

/** What the UI shows for a Member: their display name, or their email until they set one. */
export const displayName = (user: { name: string; email: string }) =>
  user.name.trim() === "" ? user.email : user.name;

/** The Member shape every procedure returns for authors, assignees and actors. */
export const toMemberSummary = (member: {
  userId: string;
  active: boolean;
  user: { name: string; email: string };
}) => ({
  id: member.userId,
  displayName: displayName(member.user),
  email: member.user.email,
  active: member.active,
});
