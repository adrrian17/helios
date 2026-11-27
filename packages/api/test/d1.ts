import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Miniflare } from "miniflare";

const migrationsDir = path.join(import.meta.dirname, "../../db/src/migrations");

/**
 * Applies the migration folders in order. `through` stops after that folder and
 * `after` starts after it, so a test can seed old data between two calls.
 * Without options every folder is applied.
 */
export const applyMigrations = async (
  d1: D1Database,
  { through, after }: { through?: string; after?: string } = {}
) => {
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();

  const indexOfFolder = (name: string) => {
    const index = folders.indexOf(name);

    if (index === -1) {
      throw new Error(`No migration folder named ${name}`);
    }

    return index;
  };

  const applied = folders.slice(
    after === undefined ? 0 : indexOfFolder(after) + 1,
    through === undefined ? undefined : indexOfFolder(through) + 1
  );

  const migrations = await Promise.all(
    applied.map(
      async (folder) =>
        await readFile(
          path.join(migrationsDir, folder, "migration.sql"),
          "utf-8"
        )
    )
  );

  const statements = migrations
    .flatMap((migration) => migration.split("--> statement-breakpoint"))
    .map((statement) => statement.trim())
    .filter(Boolean);

  if (statements.length > 0) {
    await d1.batch(statements.map((statement) => d1.prepare(statement)));
  }
};

/** A fresh Miniflare D1 database with no migrations applied; dispose it with `await using`. */
export const createEmptyD1 = async () => {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default {}",
    d1Databases: ["DB"],
  });

  return {
    d1: await miniflare.getD1Database("DB"),
    [Symbol.asyncDispose]: async () => {
      await miniflare.dispose();
    },
  };
};
