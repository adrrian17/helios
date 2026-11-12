import { describe, expect, it } from "vite-plus/test";

import { addMember, createProject, outcomeOf, signInAsAdmin } from "./fixtures";
import type { Client } from "./fixtures";
import { ADMIN_EMAIL, createHarness } from "./harness";

const adminActions = {
  "workspace.invitations": async (c) => {
    await c.workspace.invitations();
  },
  "workspace.invite": async (c) => {
    await c.workspace.invite({ email: "x@helios.test" });
  },
  "workspace.revokeInvitation": async (c) => {
    await c.workspace.revokeInvitation({ id: "x" });
  },
  "workspace.deactivate": async (c) => {
    await c.workspace.deactivate({ memberId: "x" });
  },
  "workspace.reactivate": async (c) => {
    await c.workspace.reactivate({ memberId: "x" });
  },
  "workspace.setRole": async (c) => {
    await c.workspace.setRole({ memberId: "x", role: "admin" });
  },
  "projects.create": async (c) => {
    await c.projects.create({ name: "X", prefix: "XX" });
  },
  "projects.rename": async (c) => {
    await c.projects.rename({ id: "x", name: "X" });
  },
  "projects.archive": async (c) => {
    await c.projects.archive({ id: "x" });
  },
  "projects.unarchive": async (c) => {
    await c.projects.unarchive({ id: "x" });
  },
  "workflowStates.add": async (c) => {
    await c.workflowStates.add({
      projectId: "x",
      name: "X",
      category: "started",
    });
  },
  "workflowStates.rename": async (c) => {
    await c.workflowStates.rename({ id: "x", name: "X" });
  },
  "workflowStates.move": async (c) => {
    await c.workflowStates.move({ id: "x", afterId: null });
  },
  "workflowStates.delete": async (c) => {
    await c.workflowStates.delete({ id: "x", destinationId: "y" });
  },
} satisfies Record<string, (client: Client) => Promise<void>>;

describe("Admin-only actions", () => {
  it("refuse a Member on every Admin action", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const member = await addMember(harness, admin, "member@helios.test");

    const outcomes = await Promise.all(
      Object.entries(adminActions).map(async ([name, call]) => [
        name,
        await outcomeOf(call(member.client)),
      ])
    );

    expect(Object.fromEntries(outcomes)).toStrictEqual(
      Object.fromEntries(
        Object.keys(adminActions).map((name) => [name, "FORBIDDEN"])
      )
    );
  });

  it("let an Admin act", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const project = await createProject(admin);

    await admin.projects.rename({ id: project.id, name: "Renamed" });

    await expect(admin.projects.list()).resolves.toMatchObject([
      { name: "Renamed" },
    ]);
  });
});

describe("Members and Invitations", () => {
  it("lists Members with role, status and email", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const member = await addMember(harness, admin, "member@helios.test");

    await expect(member.client.workspace.members()).resolves.toStrictEqual([
      expect.objectContaining({
        email: ADMIN_EMAIL,
        role: "admin",
        active: true,
      }),
      expect.objectContaining({
        id: member.id,
        email: "member@helios.test",
        role: "member",
        active: true,
      }),
    ]);
  });

  it("lists pending Invitations and revokes one", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const { id } = await admin.workspace.invite({ email: "New@Helios.test" });

    await expect(admin.workspace.invitations()).resolves.toMatchObject([
      { id, email: "new@helios.test", invitedBy: ADMIN_EMAIL },
    ]);

    await admin.workspace.revokeInvitation({ id });

    await expect(admin.workspace.invitations()).resolves.toStrictEqual([]);
    await harness.requestLink("new@helios.test");
    expect(harness.mailer.lastLinkTo("new@helios.test")).toBeUndefined();
  });

  it("refuses to invite an existing Member or a pending Invitation", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    await admin.workspace.invite({ email: "new@helios.test" });

    await expect(
      admin.workspace.invite({ email: "new@helios.test" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      admin.workspace.invite({ email: ADMIN_EMAIL })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("deactivation ends sessions and reactivation lets the Member back in", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const member = await addMember(harness, admin, "member@helios.test");

    await admin.workspace.deactivate({ memberId: member.id });

    await expect(member.client.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(admin.workspace.members()).resolves.toContainEqual(
      expect.objectContaining({ id: member.id, active: false })
    );

    await admin.workspace.reactivate({ memberId: member.id });
    const again = harness.clientFor(await harness.signIn("member@helios.test"));

    await expect(again.me()).resolves.toMatchObject({ id: member.id });
  });

  it("a promoted Member can use Admin actions", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const member = await addMember(harness, admin, "member@helios.test");

    await admin.workspace.setRole({ memberId: member.id, role: "admin" });

    await expect(member.client.workspace.invitations()).resolves.toStrictEqual(
      []
    );
  });

  it("a Member sets their own display name", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const member = await addMember(harness, admin, "member@helios.test");

    await member.client.workspace.setDisplayName({ name: "  Ada  " });

    await expect(admin.workspace.members()).resolves.toContainEqual(
      expect.objectContaining({ id: member.id, displayName: "Ada" })
    );
  });
});

describe("the last active Admin", () => {
  it("cannot be demoted or deactivated", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const { id } = await admin.me();

    await expect(
      admin.workspace.setRole({ memberId: id, role: "member" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      admin.workspace.deactivate({ memberId: id })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(admin.me()).resolves.toMatchObject({ role: "admin" });
  });

  it("can step down once another active Admin exists", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const { id } = await admin.me();
    const other = await addMember(harness, admin, "other@helios.test");
    await admin.workspace.setRole({ memberId: other.id, role: "admin" });

    await admin.workspace.setRole({ memberId: id, role: "member" });

    await expect(admin.me()).resolves.toMatchObject({ role: "member" });
  });

  it("counts only active Admins", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const { id } = await admin.me();
    const other = await addMember(harness, admin, "other@helios.test");
    await admin.workspace.setRole({ memberId: other.id, role: "admin" });
    await admin.workspace.deactivate({ memberId: other.id });

    await expect(
      admin.workspace.setRole({ memberId: id, role: "member" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
