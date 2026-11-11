import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  adminEmail,
  apiAs,
  archiveProject,
  column,
  horizontalOverflow,
  seedProject,
  signIn,
  uniquePrefix,
} from "./helpers";

const palette = (page: Page) =>
  page.getByRole("dialog", { name: "Command palette" });

const newIssueDialog = (page: Page) =>
  page.getByRole("dialog", { name: "New Issue" });

const MY_ISSUES = "/my-issues";

/** Keys go to the window, so wait until the signed-in page has mounted. */
const openMyIssues = async (page: Page) => {
  await page.goto(MY_ISSUES);
  await expect(page.getByRole("heading", { name: "My Issues" })).toBeVisible();
};

test.describe("desktop keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop keyboard.");

  test("Cmd+K opens an Issue by its Identifier and jumps to a Project", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Find me from the palette",
    });

    await openMyIssues(page);
    await page.keyboard.press("ControlOrMeta+k");
    await palette(page).getByRole("combobox").fill(issue.identifier);
    await expect(palette(page).getByRole("option").first()).toContainText(
      issue.identifier
    );
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(`/issue/${issue.identifier}$`, "u")
    );
    await expect(
      page.getByRole("heading", { name: "Find me from the palette" })
    ).toBeVisible();

    await page.keyboard.press("/");
    await palette(page).getByRole("combobox").fill(prefix);
    await palette(page)
      .getByRole("group", { name: "Projects" })
      .getByRole("option", { name: new RegExp(`Seed ${prefix}`, "u") })
      .click();
    await expect(page).toHaveURL(new RegExp(`/projects/${prefix}/`, "u"));

    await archiveProject(page, prefix);
  });

  test("C creates an Issue in the current Project", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    await seedProject(page, prefix);

    await page.goto(`/projects/${prefix}/board`);
    await expect(column(page, "Backlog")).toBeVisible();
    await page.keyboard.press("c");

    const dialog = newIssueDialog(page);
    await expect(dialog.getByLabel("Project")).toContainText(`Seed ${prefix}`);
    await dialog.getByLabel("Title").fill("Pressed C for this");
    await dialog.getByLabel("Title").press("Enter");
    await expect(dialog).toBeHidden();
    await expect(
      column(page, "Backlog").getByRole("link", { name: /Pressed C for this/u })
    ).toContainText(`${prefix}-1`);

    await archiveProject(page, prefix);
  });

  test("S, P and A open the Issue view's pickers; keys typed in a field or over a dialog do nothing", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Triage me by keyboard",
    });

    await page.goto(`/issue/${issue.identifier}`);
    await expect(
      page.getByRole("heading", { name: "Triage me by keyboard" })
    ).toBeVisible();

    await page.keyboard.press("s");
    await expect(page.getByRole("combobox", { name: "Move to" })).toBeFocused();
    await page.keyboard.type("In Progress");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Workflow State: In Progress" })
    ).toBeVisible();

    await page.keyboard.press("p");
    await expect(
      page.getByRole("combobox", { name: "Change Priority" })
    ).toBeFocused();
    await page.keyboard.type("Urgent");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Priority: Urgent" })
    ).toBeVisible();

    await page.keyboard.press("a");
    await expect(
      page.getByRole("combobox", { name: "Assign to" })
    ).toBeFocused();
    // Over an open picker, single keys are text for its search, not shortcuts.
    await page.keyboard.type("cs");
    await expect(page.getByRole("combobox", { name: "Assign to" })).toHaveValue(
      "cs"
    );
    await expect(newIssueDialog(page)).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("combobox", { name: "Assign to" })
    ).toBeHidden();

    const comment = page.getByLabel("Comment", { exact: true });
    await comment.click();
    await page.keyboard.type("scap");
    await expect(comment).toHaveValue("scap");
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(newIssueDialog(page)).toBeHidden();

    await archiveProject(page, prefix);
  });

  test("? lists the shortcuts and Esc closes it", async ({ page, request }) => {
    await signIn(page, request, adminEmail);
    await openMyIssues(page);
    await page.keyboard.press("?");

    const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(help).toContainText("Change Workflow State");
    await page.keyboard.press("Escape");
    await expect(help).toBeHidden();
  });
});

test.describe("phone commands", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone layout.");

  test("the Search and New Issue buttons open a full-screen palette and create an Issue", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Found by touch",
    });

    await page.goto(`/projects/${prefix}/board`);
    await page.getByRole("button", { name: "Search" }).click();

    const viewport = page.viewportSize();
    // Polled, since the palette zooms in before it settles.
    await expect
      .poll(async () => await palette(page).boundingBox(), {
        message: "the palette fills the screen",
      })
      .toEqual({
        x: 0,
        y: 0,
        width: viewport?.width,
        height: viewport?.height,
      });

    await palette(page).getByRole("combobox").fill(issue.identifier);
    await palette(page)
      .getByRole("option", { name: /Found by touch/u })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/issue/${issue.identifier}$`, "u")
    );

    await page.getByRole("button", { name: "New Issue" }).click();
    const dialog = newIssueDialog(page);
    await expect(dialog.getByLabel("Project")).toContainText(`Seed ${prefix}`);
    await dialog.getByLabel("Title").fill("Made with a thumb");
    await dialog.getByRole("button", { name: "Create Issue" }).click();
    await expect(dialog).toBeHidden();

    await page.goto(`/projects/${prefix}/list`);
    await expect(
      page.getByRole("link", { name: /Made with a thumb/u })
    ).toBeVisible();

    await archiveProject(page, prefix);
  });

  test("no main screen scrolls sideways at 360 and 390 pixels", async ({
    page,
    request,
  }) => {
    const widths = [360, 390];

    /** Every width once; each step is a page visit, so they run in order. */
    const atEveryWidth = async (screen: string, open: () => Promise<void>) => {
      for (const width of widths) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- one viewport at a time.
        await page.setViewportSize({ width, height: 780 });
        // oxlint-disable-next-line eslint/no-await-in-loop -- see above.
        await open();
        // oxlint-disable-next-line eslint/no-await-in-loop -- see above.
        const overflow = await horizontalOverflow(page);
        expect(overflow, `${screen} at ${width}px`).toBeLessThanOrEqual(0);
      }
    };

    await atEveryWidth("sign-in", async () => {
      await page.goto("/sign-in");
      await expect(page.getByLabel("Email")).toBeVisible();
    });

    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title:
        "A deliberately long title that would push a careless layout past the edge of a phone",
    });

    const screens = {
      board: `/projects/${prefix}/board`,
      list: `/projects/${prefix}/list`,
      issue: `/issue/${issue.identifier}`,
      "my issues": MY_ISSUES,
      labels: "/labels",
      members: "/members",
      settings: `/projects/${prefix}/settings`,
    };

    for (const [screen, path] of Object.entries(screens)) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each screen is a page visit.
      await atEveryWidth(screen, async () => {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
      });
    }

    await archiveProject(page, prefix);
  });
});
