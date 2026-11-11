import { describe, expect, it } from "vite-plus/test";

import {
  addMember,
  createProject,
  signInAsAdmin,
  stateNamed,
} from "./fixtures";
import type { Client } from "./fixtures";
import { createHarness } from "./harness";

type CreateFields = Partial<Parameters<Client["issues"]["create"]>[0]>;

type Filters = NonNullable<Parameters<Client["issues"]["list"]>[0]["filters"]>;

const columnTitles = async (client: Client, projectId: string) => {
  const board = await client.issues.board({ projectId });

  return Object.fromEntries(
    board.map((column) => [
      column.state.name,
      column.issues.map((row) => row.title),
    ])
  );
};

const activityOf = async (client: Client, identifier: string) => {
  const { timeline } = await client.issues.get({ identifier });

  return timeline
    .filter((entry) => entry.type === "activity")
    .map(({ kind, oldValue, newValue }) => ({ kind, oldValue, newValue }));
};

describe("Identifiers", () => {
  it("number Issues per Project and never reuse a deleted number", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const hel = await createProject(admin, "HEL");
    const ops = await createProject(admin, "OPS");

    const create = async (projectId: string) =>
      await admin.issues.create({ projectId, title: "Work" });

    const first = await create(hel.id);
    const second = await create(hel.id);
    const otherProject = await create(ops.id);
    await admin.issues.delete({ id: second.id });
    const third = await create(hel.id);

    expect(
      [first, second, otherProject, third].map((i) => i.identifier)
    ).toStrictEqual(["HEL-1", "HEL-2", "OPS-1", "HEL-3"]);
    await expect(
      admin.issues.get({ identifier: "HEL-2" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("open an Issue by Identifier, ignoring case", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const { id: creatorId } = await admin.me();

    const created = await admin.issues.create({
      projectId: project.id,
      title: "Ship it",
      description: "**Now**",
      priority: "high",
    });

    await expect(
      admin.issues.get({ identifier: "hel-1" })
    ).resolves.toMatchObject({
      id: created.id,
      identifier: "HEL-1",
      title: "Ship it",
      description: "**Now**",
      priority: "high",
      state: { name: "Backlog", category: "backlog" },
      project: { prefix: "HEL" },
      creator: { id: creatorId },
      assignee: null,
      labels: [],
      checklist: [],
    });
    await expect(
      admin.issues.get({ identifier: "HEL-99" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("creating Issues", () => {
  it("lands at the bottom of the first backlog state, or of the state given", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    await admin.workflowStates.add({
      projectId: project.id,
      name: "Triage",
      category: "backlog",
    });
    const started = stateNamed(project, "In Progress");

    await admin.issues.create({ projectId: project.id, title: "A" });
    await admin.issues.create({ projectId: project.id, title: "B" });
    await admin.issues.create({
      projectId: project.id,
      title: "C",
      stateId: started.id,
    });

    await expect(columnTitles(admin, project.id)).resolves.toMatchObject({
      Backlog: ["A", "B"],
      Triage: [],
      "In Progress": ["C"],
    });
  });

  it("assigns only active Members", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const leaver = await addMember(harness, admin, "leaver@helios.test");
    await admin.workspace.deactivate({ memberId: leaver.id });

    await expect(
      admin.issues.create({
        projectId: project.id,
        title: "A",
        assigneeId: leaver.id,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("manual ordering", () => {
  it("keeps the order of every move, within and across columns", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const backlog = stateNamed(project, "Backlog");
    const started = stateNamed(project, "In Progress");

    const create = async (title: string) =>
      await admin.issues.create({ projectId: project.id, title });

    const a = await create("A");
    const b = await create("B");
    const c = await create("C");
    const d = await create("D");

    const move = async (
      issue: { id: string },
      stateId: string,
      after: { id: string } | null
    ) => {
      await admin.issues.move({
        id: issue.id,
        stateId,
        afterId: after?.id ?? null,
      });
    };

    await move(d, backlog.id, null);
    await move(a, backlog.id, c);

    await expect(columnTitles(admin, project.id)).resolves.toMatchObject({
      Backlog: ["D", "B", "C", "A"],
    });

    await move(b, started.id, null);
    await move(c, started.id, b);
    await move(d, started.id, b);

    await expect(columnTitles(admin, project.id)).resolves.toMatchObject({
      Backlog: ["A"],
      "In Progress": ["B", "D", "C"],
    });
  });

  it("stays correct when Issues are dropped into the same gap many times", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const backlog = stateNamed(project, "Backlog");

    const top = await admin.issues.create({
      projectId: project.id,
      title: "top",
    });

    const expected = ["top"];

    for (let index = 1; index <= 12; index += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each drop must land in the gap the previous one left.
      const { id } = await admin.issues.create({
        projectId: project.id,
        title: `#${index}`,
      });

      // oxlint-disable-next-line no-await-in-loop -- each drop must land in the gap the previous one left.
      await admin.issues.move({ id, stateId: backlog.id, afterId: top.id });
      expected.splice(1, 0, `#${index}`);
    }

    await expect(columnTitles(admin, project.id)).resolves.toMatchObject({
      Backlog: expected,
    });
  });

  it("refuses a neighbour that is no longer in the target column", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const started = stateNamed(project, "In Progress");
    const a = await admin.issues.create({ projectId: project.id, title: "A" });
    const b = await admin.issues.create({ projectId: project.id, title: "B" });

    await expect(
      admin.issues.move({ id: a.id, stateId: started.id, afterId: b.id })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("Activity", () => {
  it("records creation and each tracked change with display values", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const ada = await addMember(harness, admin, "ada@helios.test");
    await ada.client.workspace.setDisplayName({ name: "Ada" });
    const bug = await admin.labels.create({ name: "Bug", color: "#ff0000" });
    const started = stateNamed(project, "In Progress");
    const done = stateNamed(project, "Done");

    const { id, identifier } = await admin.issues.create({
      projectId: project.id,
      title: "Old title",
    });

    await admin.issues.update({ id, title: "New title" });
    await admin.issues.update({ id, stateId: started.id });
    await admin.issues.move({ id, stateId: done.id, afterId: null });
    await admin.issues.update({ id, priority: "urgent" });
    await admin.issues.update({ id, assigneeId: ada.id });
    await admin.issues.update({ id, assigneeId: null });
    await admin.labels.attach({ issueId: id, labelId: bug.id });
    await admin.labels.detach({ issueId: id, labelId: bug.id });

    await expect(activityOf(admin, identifier)).resolves.toStrictEqual([
      { kind: "created", oldValue: null, newValue: null },
      { kind: "title_changed", oldValue: "Old title", newValue: "New title" },
      { kind: "state_changed", oldValue: "Backlog", newValue: "In Progress" },
      { kind: "state_changed", oldValue: "In Progress", newValue: "Done" },
      { kind: "priority_changed", oldValue: "No priority", newValue: "Urgent" },
      { kind: "assignee_changed", oldValue: null, newValue: "Ada" },
      { kind: "assignee_changed", oldValue: "Ada", newValue: null },
      { kind: "label_added", oldValue: null, newValue: "Bug" },
      { kind: "label_removed", oldValue: "Bug", newValue: null },
    ]);
  });

  it("records nothing for description, Checklist, same-column moves or unchanged values", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const backlog = stateNamed(project, "Backlog");

    const { id, identifier } = await admin.issues.create({
      projectId: project.id,
      title: "Same",
    });

    await admin.issues.update({ id, description: "Now with *Markdown*" });
    await admin.issues.update({ id, title: "Same", priority: "none" });
    await admin.issues.move({ id, stateId: backlog.id, afterId: null });
    const item = await admin.checklist.add({ issueId: id, text: "Step" });
    await admin.checklist.update({
      id: item.id,
      checked: true,
      text: "Step 1",
    });
    await admin.checklist.delete({ id: item.id });

    await expect(activityOf(admin, identifier)).resolves.toStrictEqual([
      { kind: "created", oldValue: null, newValue: null },
    ]);
  });

  it("interleaves Activity and Comments oldest first", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);

    const { id, identifier } = await admin.issues.create({
      projectId: project.id,
      title: "Talk",
    });

    await admin.comments.add({ issueId: id, body: "First" });
    await admin.issues.update({ id, priority: "low" });
    await admin.comments.add({ issueId: id, body: "Second" });

    const { timeline } = await admin.issues.get({ identifier });
    expect(
      timeline.map((entry) =>
        entry.type === "comment" ? entry.body : entry.kind
      )
    ).toStrictEqual(["created", "First", "priority_changed", "Second"]);
  });
});

describe("Board and List", () => {
  it("filter by assignee (including unassigned), Label and Priority", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const ada = await addMember(harness, admin, "ada@helios.test");
    const bug = await admin.labels.create({ name: "Bug", color: "#ff0000" });

    const create = async (title: string, fields: CreateFields = {}) =>
      await admin.issues.create({ projectId: project.id, title, ...fields });

    const mine = await create("Ada's", {
      assigneeId: ada.id,
      priority: "high",
    });

    await create("Nobody's", { priority: "low" });
    await admin.labels.attach({ issueId: mine.id, labelId: bug.id });

    const titles = async (filters: Filters) => {
      const rows = await admin.issues.list({ projectId: project.id, filters });

      return rows.map((row) => row.title);
    };

    const board = await admin.issues.board({
      projectId: project.id,
      filters: { priorities: ["low"] },
    });

    expect({
      ada: await titles({ assigneeIds: [ada.id] }),
      unassigned: await titles({ unassigned: true }),
      adaOrUnassigned: await titles({
        assigneeIds: [ada.id],
        unassigned: true,
      }),
      bug: await titles({ labelIds: [bug.id] }),
      low: await titles({ priorities: ["low"] }),
      lowOnBoard: board.flatMap((column) =>
        column.issues.map((row) => `${column.state.name}: ${row.title}`)
      ),
    }).toStrictEqual({
      ada: ["Ada's"],
      unassigned: ["Nobody's"],
      adaOrUnassigned: ["Ada's", "Nobody's"],
      bug: ["Ada's"],
      low: ["Nobody's"],
      lowOnBoard: ["Backlog: Nobody's"],
    });
  });

  it("sort the List by a field in either direction", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const done = stateNamed(project, "Done");
    await admin.issues.create({
      projectId: project.id,
      title: "b",
      priority: "low",
    });
    await admin.issues.create({
      projectId: project.id,
      title: "a",
      priority: "urgent",
      stateId: done.id,
    });
    await admin.issues.create({ projectId: project.id, title: "c" });

    const sorted = async (
      field: "priority" | "title" | "state",
      direction: "asc" | "desc"
    ) => {
      const rows = await admin.issues.list({
        projectId: project.id,
        sort: { field, direction },
      });

      return rows.map((row) => row.identifier);
    };

    await expect(sorted("priority", "asc")).resolves.toStrictEqual([
      "HEL-2",
      "HEL-1",
      "HEL-3",
    ]);
    await expect(sorted("title", "desc")).resolves.toStrictEqual([
      "HEL-3",
      "HEL-1",
      "HEL-2",
    ]);
    await expect(sorted("state", "asc")).resolves.toStrictEqual([
      "HEL-1",
      "HEL-3",
      "HEL-2",
    ]);
  });

  it("cards carry Checklist progress", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);

    const { id } = await admin.issues.create({
      projectId: project.id,
      title: "A",
    });

    const first = await admin.checklist.add({ issueId: id, text: "One" });
    await admin.checklist.add({ issueId: id, text: "Two" });
    await admin.checklist.update({ id: first.id, checked: true });

    const [row] = await admin.issues.list({ projectId: project.id });

    expect(row?.checklist).toStrictEqual({ done: 1, total: 2 });
  });
});

describe("My Issues", () => {
  it("lists my backlog and started Issues in active Projects, grouped by Project and sorted by Priority", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const me = await addMember(harness, admin, "me@helios.test");
    const zeta = await createProject(admin, "ZET");
    const alpha = await createProject(admin, "ALP");
    const old = await createProject(admin, "OLD");

    const create = async (
      project: typeof alpha,
      title: string,
      fields: {
        state?: string;
        priority?: "urgent" | "high" | "low";
        assigneeId?: string;
      } = {}
    ) =>
      await admin.issues.create({
        projectId: project.id,
        title,
        assigneeId: fields.assigneeId ?? me.id,
        ...(fields.priority !== undefined && { priority: fields.priority }),
        ...(fields.state !== undefined && {
          stateId: stateNamed(project, fields.state).id,
        }),
      });

    await create(alpha, "low backlog", { priority: "low" });
    await create(alpha, "urgent started", {
      priority: "urgent",
      state: "In Progress",
    });
    await create(alpha, "no priority");
    await create(zeta, "zeta high", { priority: "high" });
    await create(alpha, "idea", { state: "Ideas" });
    await create(alpha, "done", { state: "Done" });
    await create(alpha, "cancelled", { state: "Cancelled" });
    const { id: adminId } = await admin.me();
    await create(alpha, "someone else's", { assigneeId: adminId });
    await create(old, "archived");
    await admin.projects.archive({ id: old.id });

    const groups = await me.client.issues.mine();

    expect(
      groups.map((group) => ({
        project: group.project.prefix,
        issues: group.issues.map((row) => row.title),
      }))
    ).toStrictEqual([
      {
        project: "ALP",
        issues: ["urgent started", "low backlog", "no priority"],
      },
      { project: "ZET", issues: ["zeta high"] },
    ]);
  });
});

const searchFor = async (client: Client, query: string) => {
  const rows = await client.issues.search({ query });

  return rows.map((row) => row.identifier);
};

describe("search", () => {
  it("finds an Issue by Identifier or by title, skipping archived Projects for titles", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin, "HEL");
    const old = await createProject(admin, "OLD");
    await admin.issues.create({ projectId: project.id, title: "Fix login" });
    await admin.issues.create({ projectId: project.id, title: "Polish board" });
    await admin.issues.create({ projectId: old.id, title: "Old login bug" });
    await admin.projects.archive({ id: old.id });

    await expect(searchFor(admin, "hel-2")).resolves.toStrictEqual(["HEL-2"]);
    await expect(searchFor(admin, "LOGIN")).resolves.toStrictEqual(["HEL-1"]);
    await expect(searchFor(admin, "OLD-1")).resolves.toStrictEqual(["OLD-1"]);
  });

  it("finds an Issue when every word appears in its title or Identifier, in any order", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin, "HEL");
    await admin.issues.create({ projectId: project.id, title: "Fix login" });
    await admin.issues.create({
      projectId: project.id,
      title: "Update the pricing page copy",
    });

    await expect(searchFor(admin, "pricing copy")).resolves.toStrictEqual([
      "HEL-2",
    ]);
    await expect(searchFor(admin, "copy  PRICING")).resolves.toStrictEqual([
      "HEL-2",
    ]);
    await expect(searchFor(admin, "hel 1")).resolves.toStrictEqual(["HEL-1"]);
    await expect(searchFor(admin, "login pricing")).resolves.toStrictEqual([]);
  });

  it("puts an exact Identifier first and survives many or very long words", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin, "HEL");
    await admin.issues.create({ projectId: project.id, title: "Fix login" });
    await admin.issues.create({
      projectId: project.id,
      title: "Follow up on HEL-1",
    });

    const manyNumbers = Array.from({ length: 60 }, (_, index) =>
      String(index)
    ).join(" ");

    await expect(searchFor(admin, "HEL-1")).resolves.toStrictEqual([
      "HEL-1",
      "HEL-2",
    ]);
    await expect(searchFor(admin, manyNumbers)).resolves.toStrictEqual([]);
    await expect(searchFor(admin, "🔥".repeat(60))).resolves.toStrictEqual([]);
  });
});
