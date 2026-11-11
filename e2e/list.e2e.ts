import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  adminEmail,
  apiAs,
  assignToAdmin,
  archiveProject,
  horizontalOverflow,
  column,
  seedProject,
  signIn,
  uniquePrefix,
} from "./helpers";

const rows = (page: Page) => page.getByRole("table").locator("tbody tr");

const titles = (...names: string[]) =>
  names.map((name) => new RegExp(name, "u"));

test.describe("desktop list", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop List.");

  test("the List sorts from its headers, filters through the URL and leaves Board order alone", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);
    await apiAs(page).issues.create({
      projectId: project.id,
      title: "Charlie",
    });

    const alpha = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Alpha",
      priority: "urgent",
    });

    await assignToAdmin(page, alpha.identifier);

    await apiAs(page).issues.create({
      projectId: project.id,
      title: "Bravo",
      priority: "low",
    });

    await page.goto(`/projects/${prefix}/list`);
    await expect(rows(page)).toHaveText(titles("Charlie", "Alpha", "Bravo"));

    await page.getByRole("button", { name: "Title" }).click();
    await expect(rows(page)).toHaveText(titles("Alpha", "Bravo", "Charlie"));
    await expect(
      page.getByRole("columnheader", { name: "Title" })
    ).toHaveAttribute("aria-sort", "ascending");

    await page.getByRole("button", { name: "Title" }).click();
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo", "Alpha"));

    await page.getByRole("button", { name: "Priority", exact: true }).click();
    await expect(rows(page)).toHaveText(titles("Alpha", "Bravo", "Charlie"));

    await page.getByRole("button", { name: "Priority filter" }).click();
    await page.getByRole("option", { name: "Urgent" }).click();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/priority=/u);
    await expect(rows(page)).toHaveText(titles("Alpha"));

    await page.reload();
    await expect(rows(page)).toHaveText(titles("Alpha"));

    await page.getByRole("link", { name: "Board" }).click();
    await expect(page).toHaveURL(/\/board\?.*priority=/u);
    await expect(column(page, "Backlog").getByRole("link")).toHaveText(
      titles("Alpha")
    );

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/priority=/u);
    // Sorting the List never moved anything: the Board keeps creation order.
    await expect(column(page, "Backlog").getByRole("link")).toHaveText(
      titles("Charlie", "Alpha", "Bravo")
    );

    await page.getByRole("link", { name: "List" }).click();
    await page.getByRole("button", { name: "Assignee filter" }).click();
    await page.getByRole("option", { name: "Unassigned" }).click();
    await page.keyboard.press("Escape");
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo"));

    await page.goto(`/projects/${prefix}`);
    await expect(page).toHaveURL(new RegExp(`/projects/${prefix}/list`, "u"));

    await archiveProject(page, prefix);
  });

  test("My Issues shows my backlog and started Issues by Project, most urgent first", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);
    const api = apiAs(page);

    const create = async (
      title: string,
      rest: Partial<Parameters<typeof api.issues.create>[0]> = {}
    ) => await api.issues.create({ projectId: project.id, title, ...rest });

    const mine = [
      await create("Low backlog", { priority: "low" }),
      await create("Urgent started", {
        priority: "urgent",
        stateId: project.stateId("In Progress"),
      }),
      await create("Already done", { stateId: project.stateId("Done") }),
      await create("Just an idea", { stateId: project.stateId("Ideas") }),
    ];

    await create("Nobody's");

    for (const issue of mine) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each assignment is a page visit; they cannot overlap in one page.
      await assignToAdmin(page, issue.identifier);
    }

    await page.goto("/my-issues");

    const group = page.getByRole("region", {
      name: new RegExp(`Seed ${prefix}`, "u"),
    });

    await expect(group.getByRole("listitem")).toHaveText(
      titles("Urgent started", "Low backlog")
    );

    await archiveProject(page, prefix);
    await page.goto("/my-issues");
    await expect(
      page.getByRole("heading", { name: "My Issues" })
    ).toBeVisible();
    await expect(group).toBeHidden();
  });
});

test.describe("phone list", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone layout.");

  test("phone List rows are compact and the page never scrolls sideways", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    await apiAs(page).issues.create({
      projectId: project.id,
      title:
        "A deliberately long title that would push a wide table past the edge of a phone",
      priority: "high",
    });

    await page.goto(`/projects/${prefix}/list`);

    await Promise.all(
      ["ID", "Title", "Priority", "Assignee"].map(async (name) => {
        await expect(page.getByRole("columnheader", { name })).toBeVisible();
      })
    );

    await Promise.all(
      ["State", "Created", "Updated"].map(async (name) => {
        await expect(page.getByRole("columnheader", { name })).toBeHidden();
      })
    );

    const overflow = await horizontalOverflow(page);

    expect(overflow, "no horizontal page scroll").toBeLessThanOrEqual(0);

    await archiveProject(page, prefix);
  });
});
