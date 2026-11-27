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
