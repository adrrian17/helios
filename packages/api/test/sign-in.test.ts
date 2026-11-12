import { deactivateMember } from "@helios/auth/members";
import { invitation } from "@helios/db/schema/tracker";
import { describe, expect, it } from "vite-plus/test";

import { ADMIN_EMAIL, createHarness } from "./harness";
import type { Harness } from "./harness";

const signInAsAdmin = async (harness: Harness) => {
  const headers = await harness.signIn(ADMIN_EMAIL);
  const admin = await harness.clientFor(headers).me();

  return { admin, headers };
};

const invite = async (harness: Harness, email: string) => {
  const { admin } = await signInAsAdmin(harness);
  await harness.db.insert(invitation).values({ email, invitedById: admin.id });
};

describe("who receives a magic link", () => {
  it("the seeded Admin receives one on the first request", async () => {
    await using harness = await createHarness();
    await harness.requestLink(ADMIN_EMAIL);

    expect(harness.mailer.lastLinkTo(ADMIN_EMAIL)).toContain(
      "/magic-link/verify"
    );
  });

  it("a pending Invitation receives one", async () => {
    await using harness = await createHarness();
    await invite(harness, "new@helios.test");

    await harness.requestLink("new@helios.test");

    expect(harness.mailer.lastLinkTo("new@helios.test")).toBeDefined();
  });

  it("an unknown email receives nothing and the same response", async () => {
    await using harness = await createHarness();
    const sent = await harness.requestLink(ADMIN_EMAIL);
    const unknown = await harness.requestLink("stranger@helios.test");

    expect(harness.mailer.lastLinkTo("stranger@helios.test")).toBeUndefined();
    expect(unknown).toStrictEqual(sent);
  });

  it("a revoked Invitation receives nothing", async () => {
    await using harness = await createHarness();
    const { admin } = await signInAsAdmin(harness);
    await harness.db.insert(invitation).values({
      email: "revoked@helios.test",
      invitedById: admin.id,
      status: "revoked",
    });

    await harness.requestLink("revoked@helios.test");

    expect(harness.mailer.lastLinkTo("revoked@helios.test")).toBeUndefined();
  });

  it("a deactivated Member receives nothing and the same response", async () => {
    await using harness = await createHarness();
    await invite(harness, "leaver@helios.test");

    const leaver = await harness
      .clientFor(await harness.signIn("leaver@helios.test"))
      .me();

    const sent = await harness.requestLink(ADMIN_EMAIL);
    harness.mailer.clear();

    await deactivateMember(harness.db, leaver.id);
    const refused = await harness.requestLink("leaver@helios.test");

    expect(harness.mailer.lastLinkTo("leaver@helios.test")).toBeUndefined();
    expect(refused).toStrictEqual(sent);
  });

  it("emails match ignoring case", async () => {
    await using harness = await createHarness();
    await harness.requestLink("Admin@Helios.Test");

    expect(harness.mailer.lastLinkTo(ADMIN_EMAIL)).toBeDefined();
  });
});

describe("signing in", () => {
  it("the seeded Admin signs in as an Admin", async () => {
    await using harness = await createHarness();
    const { admin } = await signInAsAdmin(harness);

    expect(admin).toMatchObject({ email: ADMIN_EMAIL, role: "admin" });
  });

  it("an invited person's first sign-in makes them a Member", async () => {
    await using harness = await createHarness();
    await invite(harness, "new@helios.test");

    const headers = await harness.signIn("new@helios.test");

    await expect(harness.clientFor(headers).me()).resolves.toMatchObject({
      email: "new@helios.test",
      role: "member",
    });
  });

  it("an accepted Invitation keeps working as a Member account", async () => {
    await using harness = await createHarness();
    await invite(harness, "new@helios.test");
    await harness.signIn("new@helios.test");

    const again = await harness.signIn("new@helios.test");

    await expect(harness.clientFor(again).me()).resolves.toMatchObject({
      role: "member",
    });
  });

  it("a magic link works only once", async () => {
    await using harness = await createHarness();
    await harness.requestLink(ADMIN_EMAIL);
    const link = harness.mailer.lastLinkTo(ADMIN_EMAIL) ?? "";
    await harness.openLink(link);

    const reused = await harness.openLink(link);

    await expect(harness.clientFor(reused).me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("a link sent before deactivation no longer signs in", async () => {
    await using harness = await createHarness();
    await invite(harness, "leaver@helios.test");

    const leaver = await harness
      .clientFor(await harness.signIn("leaver@helios.test"))
      .me();

    await harness.requestLink("leaver@helios.test");
    const link = harness.mailer.lastLinkTo("leaver@helios.test") ?? "";

    await deactivateMember(harness.db, leaver.id);
    const headers = await harness.openLink(link);

    await expect(harness.sessionFor(headers)).resolves.toBeNull();
    await expect(harness.clientFor(headers).me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("deactivation revokes existing sessions", async () => {
    await using harness = await createHarness();
    await invite(harness, "leaver@helios.test");
    const headers = await harness.signIn("leaver@helios.test");
    const leaver = await harness.clientFor(headers).me();

    await deactivateMember(harness.db, leaver.id);

    await expect(harness.sessionFor(headers)).resolves.toBeNull();
    await expect(harness.clientFor(headers).me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("calls without a session are rejected", async () => {
    await using harness = await createHarness();
    await expect(harness.clientFor().me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("seed", () => {
  it("repeated link requests seed only once", async () => {
    await using harness = await createHarness();
    await harness.requestLink(ADMIN_EMAIL);
    await harness.requestLink(ADMIN_EMAIL);

    const { admin, headers } = await signInAsAdmin(harness);

    expect(admin.role).toBe("admin");
    await expect(harness.clientFor(headers).me()).resolves.toStrictEqual(admin);
  });

  it("changing ADMIN_EMAIL after install creates no second Admin", async () => {
    await using harness = await createHarness();
    await harness.requestLink(ADMIN_EMAIL);

    await harness.requestLink(
      "other@helios.test",
      harness.authFor("other@helios.test")
    );

    expect(harness.mailer.lastLinkTo("other@helios.test")).toBeUndefined();
  });
});
