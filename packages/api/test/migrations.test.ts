import { describe, expect, it } from "vite-plus/test";

import { applyMigrations, createEmptyD1 } from "./d1";

/** The last migration folder of Helios v1. Everything after it is under test. */
const LAST_V1_MIGRATION = "20261111050626_dear_mongu";

const REMOVED_TABLES = new Set(["label", "issue_label", "checklist_item"]);

/** Inserts rows shaped like Helios v1: the current API can no longer write them. */
const seedV1 = async (d1: D1Database) => {
  const rows = [
    `INSERT INTO user (id, name, email) VALUES ('u1', 'Ada', 'ada@helios.test'), ('u2', 'Grace', 'grace@helios.test')`,
    `INSERT INTO member (user_id, role) VALUES ('u1', 'admin'), ('u2', 'member')`,
    `INSERT INTO invitation (id, email, invited_by_id) VALUES ('inv1', 'new@helios.test', 'u1')`,
    `INSERT INTO project (id, name, prefix, next_issue_number) VALUES ('p1', 'Helios', 'HEL', 3)`,
    `INSERT INTO workflow_state (id, project_id, name, category, position) VALUES
      ('s1', 'p1', 'Backlog', 'backlog', 'a0'),
      ('s2', 'p1', 'In progress', 'started', 'a0'),
      ('s3', 'p1', 'Done', 'completed', 'a0')`,
    `INSERT INTO issue (id, project_id, number, title, priority, assignee_id, state_id, position, creator_id) VALUES
      ('i1', 'p1', 1, 'First', 'urgent', 'u2', 's2', 'a0', 'u1'),
      ('i2', 'p1', 2, 'Second', 'none', NULL, 's3', 'a0', 'u1')`,
    `INSERT INTO label (id, name, color) VALUES ('l1', 'bug', '#ff0000')`,
    `INSERT INTO issue_label (issue_id, label_id) VALUES ('i1', 'l1')`,
    `INSERT INTO checklist_item (id, issue_id, text, checked, position) VALUES ('c1', 'i1', 'Write tests', 1, 'a0')`,
    `INSERT INTO comment (id, issue_id, author_id, body) VALUES ('cm1', 'i1', 'u2', 'Looks good')`,
    `INSERT INTO activity_entry (id, issue_id, actor_id, kind, old_value, new_value) VALUES
      ('a1', 'i1', 'u1', 'created', NULL, NULL),
      ('a2', 'i1', 'u1', 'title_changed', 'Old', 'First'),
      ('a3', 'i1', 'u1', 'state_changed', 'Backlog', 'In progress'),
      ('a4', 'i1', 'u1', 'priority_changed', 'none', 'urgent'),
      ('a5', 'i1', 'u1', 'assignee_changed', NULL, 'Grace'),
      ('a6', 'i1', 'u1', 'label_added', NULL, 'bug'),
      ('a7', 'i1', 'u1', 'label_removed', 'bug', NULL)`,
  ];

  await d1.batch(rows.map((row) => d1.prepare(row)));
};

const countOf = async (d1: D1Database, table: string) => {
  const row = await d1
    .prepare(`SELECT count(*) AS total FROM ${table}`)
    .first<{ total: number }>();

  return row?.total;
};

const tableNames = async (d1: D1Database) => {
  const { results } = await d1
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all<{ name: string }>();

  return results.map((row) => row.name);
};

/** A D1 database that held Helios v1 data and has had every later migration applied. */
const migratedFromV1 = async () => {
  const empty = await createEmptyD1();

  await applyMigrations(empty.d1, { through: LAST_V1_MIGRATION });
  await seedV1(empty.d1);
  await applyMigrations(empty.d1, { after: LAST_V1_MIGRATION });

  return empty;
};

describe("migrations over Helios v1 data", () => {
  it("clears Issues and what hangs from them", async () => {
    await using empty = await migratedFromV1();
    const { d1 } = empty;

    await expect(countOf(d1, "issue")).resolves.toBe(0);
    await expect(countOf(d1, "comment")).resolves.toBe(0);
    await expect(countOf(d1, "activity_entry")).resolves.toBe(0);
  });

  it("drops the Label and Checklist tables", async () => {
    await using empty = await migratedFromV1();
    const tables = await tableNames(empty.d1);

    expect(tables.filter((name) => REMOVED_TABLES.has(name))).toStrictEqual([]);
  });

  it("keeps Projects and people", async () => {
    await using empty = await migratedFromV1();
    const { d1 } = empty;

    await expect(countOf(d1, "project")).resolves.toBe(1);
    await expect(countOf(d1, "member")).resolves.toBe(2);
    await expect(countOf(d1, "invitation")).resolves.toBe(1);

    // The identifier counter must not restart, or the next Issue would reuse HEL-1.
    const project = await d1
      .prepare(`SELECT next_issue_number AS next FROM project WHERE id = 'p1'`)
      .first<{ next: number }>();

    expect(project?.next).toBe(3);
  });
});
