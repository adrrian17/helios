import { describe, expect, it } from "vite-plus/test";

import { addMember, createProject, signInAsAdmin } from "./fixtures";
import type { Client } from "./fixtures";
import { createHarness } from "./harness";
import type { Harness } from "./harness";

const issueWithTwoMembers = async (harness: Harness) => {
  const admin = await signInAsAdmin(harness);
  const project = await createProject(admin);
  const author = await addMember(harness, admin, "author@helios.test");
  const other = await addMember(harness, admin, "other@helios.test");

  const issue = await admin.issues.create({
    projectId: project.id,
    title: "Discuss",
  });

  return { admin, author, other, issue };
};

const commentsOn = async (client: Client, identifier: string) => {
  const { timeline } = await client.issues.get({ identifier });

  return timeline.filter((entry) => entry.type === "comment");
};

describe("Comments", () => {
  it("the author edits their Comment and it is marked edited", async () => {
    await using harness = await createHarness();
    const { author, issue } = await issueWithTwoMembers(harness);

    const { id } = await author.client.comments.add({
      issueId: issue.id,
      body: "Frist",
    });

    await expect(
      commentsOn(author.client, issue.identifier)
    ).resolves.toMatchObject([
      { body: "Frist", editedAt: null, author: { id: author.id } },
    ]);

    await author.client.comments.edit({ id, body: "First" });

    const [edited] = await commentsOn(author.client, issue.identifier);
    expect(edited).toMatchObject({ body: "First" });
    expect(edited?.editedAt).toBeInstanceOf(Date);
  });

  it("refuses edits and deletes of someone else's Comment", async () => {
    await using harness = await createHarness();
    const { admin, author, other, issue } = await issueWithTwoMembers(harness);

    const { id } = await author.client.comments.add({
      issueId: issue.id,
      body: "Mine",
    });

    await expect(
      other.client.comments.edit({ id, body: "Yours now" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      admin.comments.edit({ id, body: "Admin words" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(other.client.comments.delete({ id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      commentsOn(author.client, issue.identifier)
    ).resolves.toMatchObject([{ body: "Mine" }]);
  });

  it("the author deletes their own Comment and an Admin deletes any", async () => {
    await using harness = await createHarness();
    const { admin, author, issue } = await issueWithTwoMembers(harness);

    const own = await author.client.comments.add({
      issueId: issue.id,
      body: "a",
    });

    const moderated = await author.client.comments.add({
      issueId: issue.id,
      body: "b",
    });

    await author.client.comments.delete({ id: own.id });
    await admin.comments.delete({ id: moderated.id });

    await expect(commentsOn(admin, issue.identifier)).resolves.toStrictEqual(
      []
    );
  });
});

describe("Labels", () => {
  it("names are unique ignoring case, on create and on rename", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    await admin.labels.create({ name: "Bug", color: "#ff0000" });

    const feature = await admin.labels.create({
      name: "Feature",
      color: "#00ff00",
    });

    await expect(
      admin.labels.create({ name: "bug", color: "#0000ff" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      admin.labels.update({ id: feature.id, name: "BUG" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("are renamed, recoloured and listed by name", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const { id } = await admin.labels.create({ name: "zzz", color: "#ff0000" });
    await admin.labels.create({ name: "Docs", color: "#00ff00" });

    await admin.labels.update({ id, name: "Bug", color: "#123abc" });

    await expect(admin.labels.list()).resolves.toStrictEqual([
      { id, name: "Bug", color: "#123abc" },
      expect.objectContaining({ name: "Docs" }),
    ]);
  });

  it("deleting a Label removes it from every Issue", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);
    const bug = await admin.labels.create({ name: "Bug", color: "#ff0000" });

    const issue = await admin.issues.create({
      projectId: project.id,
      title: "A",
    });

    await admin.labels.attach({ issueId: issue.id, labelId: bug.id });

    await expect(
      admin.issues.get({ identifier: issue.identifier })
    ).resolves.toMatchObject({ labels: [{ name: "Bug" }] });

    await admin.labels.delete({ id: bug.id });

    await expect(
      admin.issues.get({ identifier: issue.identifier })
    ).resolves.toMatchObject({ labels: [] });
  });
});

describe("Checklist", () => {
  it("adds, checks, edits, reorders and deletes items", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);

    const issue = await admin.issues.create({
      projectId: project.id,
      title: "A",
    });

    const add = async (text: string) =>
      await admin.checklist.add({ issueId: issue.id, text });

    const one = await add("One");
    const two = await add("Two");
    const three = await add("Three");
    await admin.checklist.update({ id: two.id, checked: true, text: "Two!" });
    await admin.checklist.move({ id: three.id, afterId: null });
    await admin.checklist.move({ id: one.id, afterId: two.id });
    await admin.checklist.delete({ id: two.id });
    await add("Four");

    const { checklist } = await admin.issues.get({
      identifier: issue.identifier,
    });

    expect(
      checklist.map(({ text, checked }) => ({ text, checked }))
    ).toStrictEqual([
      { text: "Three", checked: false },
      { text: "One", checked: false },
      { text: "Four", checked: false },
    ]);
  });
});
