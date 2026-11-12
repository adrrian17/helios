import { describe, expect, it } from "vite-plus/test";

import {
  addMember,
  createProject,
  outcomeOf,
  signInAsAdmin,
  stateNamed,
} from "./fixtures";
import { createHarness } from "./harness";

describe("Projects", () => {
  it("a new Project starts with one Workflow State per State Category, in column order", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);

    const project = await createProject(admin);

    expect(
      project.states.map(({ name, category }) => ({ name, category }))
    ).toStrictEqual([
      { name: "Ideas", category: "ideas" },
      { name: "Backlog", category: "backlog" },
      { name: "In Progress", category: "started" },
      { name: "Done", category: "completed" },
      { name: "Cancelled", category: "cancelled" },
    ]);
  });

  it("rejects a prefix that is not 2 to 5 uppercase letters", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);

    const outcomes = await Promise.all(
      ["H", "HELIOS", "hel", "H3L"].map(
        async (prefix) =>
          await outcomeOf(admin.projects.create({ name: "X", prefix }))
      )
    );

    expect(outcomes).toStrictEqual(
      Array.from({ length: 4 }, () => "BAD_REQUEST")
    );
  });

  it("rejects a prefix already used, even by an archived Project", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin, "HEL");
    await admin.projects.archive({ id: project.id });

    await expect(
      admin.projects.create({ name: "Again", prefix: "HEL" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("renaming keeps the prefix and the Identifiers", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin, "HEL");

    const { identifier } = await admin.issues.create({
      projectId: project.id,
      title: "First",
    });

    await admin.projects.rename({ id: project.id, name: "Helios Web" });

    await expect(admin.projects.get({ prefix: "HEL" })).resolves.toMatchObject({
      name: "Helios Web",
      prefix: "HEL",
    });
    await expect(admin.issues.get({ identifier })).resolves.toMatchObject({
      identifier: "HEL-1",
    });
  });

  it("archived Projects leave the active list for the archive list and come back", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const member = await addMember(harness, admin, "member@helios.test");
    const kept = await createProject(admin, "KEEP");
    const old = await createProject(admin, "OLD");

    await admin.projects.archive({ id: old.id });

    await expect(member.client.projects.list()).resolves.toMatchObject([
      { id: kept.id },
    ]);
    await expect(member.client.projects.listArchived()).resolves.toMatchObject([
      { id: old.id },
    ]);

    await admin.projects.unarchive({ id: old.id });

    await expect(member.client.projects.listArchived()).resolves.toStrictEqual(
      []
    );
  });
});

describe("Workflow States", () => {
  it("columns follow State Category order, then position inside a category", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);

    await admin.workflowStates.add({
      projectId: project.id,
      name: "In Review",
      category: "started",
    });
    await admin.workflowStates.add({
      projectId: project.id,
      name: "Someday",
      category: "ideas",
    });
    const review = await admin.projects.get({ prefix: "HEL" });
    await admin.workflowStates.move({
      id: stateNamed(review, "In Review").id,
      afterId: null,
    });
    await admin.workflowStates.rename({
      id: stateNamed(review, "Someday").id,
      name: "Maybe",
    });

    const { states } = await admin.projects.get({ prefix: "HEL" });

    expect(states.map((state) => state.name)).toStrictEqual([
      "Ideas",
      "Maybe",
      "Backlog",
      "In Review",
      "In Progress",
      "Done",
      "Cancelled",
    ]);
  });

  it("a state moves only within its own State Category", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);

    await expect(
      admin.workflowStates.move({
        id: stateNamed(project, "Done").id,
        afterId: stateNamed(project, "Backlog").id,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deleting a state moves its Issues to the end of the destination with Activity", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const started = stateNamed(project, "In Progress");

    const already = await admin.issues.create({
      projectId: project.id,
      title: "Already started",
      stateId: started.id,
    });

    const first = await admin.issues.create({
      projectId: project.id,
      title: "First",
    });

    const second = await admin.issues.create({
      projectId: project.id,
      title: "Second",
    });

    const { id: review } = await admin.workflowStates.add({
      projectId: project.id,
      name: "In Review",
      category: "started",
    });

    await admin.issues.move({ id: first.id, stateId: review, afterId: null });
    await admin.issues.move({
      id: second.id,
      stateId: review,
      afterId: first.id,
    });

    await admin.workflowStates.delete({
      id: review,
      destinationId: started.id,
    });

    const board = await admin.issues.board({ projectId: project.id });
    expect(
      board.map((column) => ({
        state: column.state.name,
        issues: column.issues.map((row) => row.id),
      }))
    ).toStrictEqual([
      { state: "Ideas", issues: [] },
      { state: "Backlog", issues: [] },
      { state: "In Progress", issues: [already.id, first.id, second.id] },
      { state: "Done", issues: [] },
      { state: "Cancelled", issues: [] },
    ]);

    const { timeline } = await admin.issues.get({
      identifier: first.identifier,
    });

    expect(timeline.at(-1)).toMatchObject({
      type: "activity",
      kind: "state_changed",
      oldValue: "In Review",
      newValue: "In Progress",
    });
  });

  it("refuses to delete the last backlog state, but allows it once another exists", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const backlog = stateNamed(project, "Backlog");
    const ideas = stateNamed(project, "Ideas");

    await expect(
      admin.workflowStates.delete({ id: backlog.id, destinationId: ideas.id })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await admin.workflowStates.add({
      projectId: project.id,
      name: "Triage",
      category: "backlog",
    });
    await admin.workflowStates.delete({
      id: backlog.id,
      destinationId: ideas.id,
    });

    const { states } = await admin.projects.get({ prefix: "HEL" });
    expect(states.map((state) => state.name)).toContain("Triage");
    expect(states.map((state) => state.name)).not.toContain("Backlog");
  });

  it("refuses a destination that is the same state or in another Project", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin, "HEL");
    const other = await createProject(admin, "OTH");
    const done = stateNamed(project, "Done");

    await expect(
      admin.workflowStates.delete({ id: done.id, destinationId: done.id })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin.workflowStates.delete({
        id: done.id,
        destinationId: stateNamed(other, "Done").id,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
