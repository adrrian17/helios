import { describe, expect, it } from "vite-plus/test";

import { addMember, signInAsAdmin } from "./fixtures";
import { ADMIN_EMAIL, createHarness } from "./harness";

describe("who receives a magic link", () => {
  it("an unknown email receives nothing and the same response", async () => {
    await using harness = await createHarness();
    const sent = await harness.requestLink(ADMIN_EMAIL);
    const unknown = await harness.requestLink("stranger@helios.test");

    expect(harness.mailer.lastLinkTo("stranger@helios.test")).toBeUndefined();
    expect(unknown).toStrictEqual(sent);
  });

  it("a deactivated Member receives nothing and the same response", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    const leaver = await addMember(harness, admin, "leaver@helios.test");

    const sent = await harness.requestLink(ADMIN_EMAIL);
    harness.mailer.clear();

    await admin.workspace.deactivate({ memberId: leaver.id });
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
  it("the seeded Admin signs in as an Admin on the first request", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);

    await expect(admin.me()).resolves.toMatchObject({
      email: ADMIN_EMAIL,
      role: "admin",
    });
  });

  it("an invited person's first sign-in makes them a Member", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    await admin.workspace.invite({ email: "new@helios.test" });

    const headers = await harness.signIn("new@helios.test");

    await expect(harness.clientFor(headers).me()).resolves.toMatchObject({
      email: "new@helios.test",
      role: "member",
    });
  });

  it("an accepted Invitation keeps working as a Member account", async () => {
    await using harness = await createHarness();
    const admin = await signInAsAdmin(harness);
    await addMember(harness, admin, "new@helios.test");

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
    const admin = await signInAsAdmin(harness);
    const leaver = await addMember(harness, admin, "leaver@helios.test");

    await harness.requestLink("leaver@helios.test");
    const link = harness.mailer.lastLinkTo("leaver@helios.test") ?? "";

    await admin.workspace.deactivate({ memberId: leaver.id });
    const headers = await harness.openLink(link);
    await admin.workspace.reactivate({ memberId: leaver.id });

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

    const admin = await signInAsAdmin(harness);

    await expect(admin.me()).resolves.toMatchObject({ role: "admin" });
  });

  it("changing ADMIN_EMAIL after install creates no second Admin", async () => {
    await using harness = await createHarness();
    const sent = await harness.requestLink(ADMIN_EMAIL);

    const other = await harness.requestLink(
      "other@helios.test",
      harness.authFor("other@helios.test")
    );

    expect(other).toStrictEqual(sent);
    expect(harness.mailer.lastLinkTo("other@helios.test")).toBeUndefined();
  });
});
