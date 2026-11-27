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

const filterUnassigned = async (page: Page) => {
  await page.getByRole("button", { name: "Filtro de responsable" }).click();
  await page.getByRole("option", { name: "Sin responsable" }).click();
  await page.keyboard.press("Escape");
};

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
    });

    await assignToAdmin(page, alpha.identifier);

    await apiAs(page).issues.create({
      projectId: project.id,
      title: "Bravo",
    });

    await page.goto(`/projects/${prefix}/list`);
    await expect(rows(page)).toHaveText(titles("Charlie", "Alpha", "Bravo"));

    await page.getByRole("button", { name: "Título", exact: true }).click();
    await expect(rows(page)).toHaveText(titles("Alpha", "Bravo", "Charlie"));
    await expect(
      page.getByRole("columnheader", { name: "Título" })
    ).toHaveAttribute("aria-sort", "ascending");

    await page.getByRole("button", { name: "Título", exact: true }).click();
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo", "Alpha"));

    await page
      .getByRole("button", { name: "Responsable", exact: true })
      .click();
    await expect(rows(page)).toHaveText(titles("Alpha", "Charlie", "Bravo"));

    await filterUnassigned(page);
    await expect(page).toHaveURL(/assignee=/u);
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo"));

    await page.reload();
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo"));

    await page.getByRole("link", { name: "Tablero" }).click();
    await expect(page).toHaveURL(/\/board\?.*assignee=/u);
    await expect(column(page, "Pendiente").getByRole("link")).toHaveText(
      titles("Charlie", "Bravo")
    );

    await page.getByRole("button", { name: "Quitar filtros" }).click();
    await expect(page).not.toHaveURL(/assignee=/u);
    // Sorting the List never moved anything: the Board keeps creation order.
    await expect(column(page, "Pendiente").getByRole("link")).toHaveText(
      titles("Charlie", "Alpha", "Bravo")
    );

    await page.getByRole("link", { name: "Lista" }).click();
    // The Board's own filter bar stays up until the List has loaded; wait for the List's.
    await expect(rows(page)).toHaveText(titles("Charlie", "Alpha", "Bravo"));
    await filterUnassigned(page);
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo"));

    await page.goto(`/projects/${prefix}`);
    await expect(page).toHaveURL(new RegExp(`/projects/${prefix}/list`, "u"));

    await archiveProject(page, prefix);
  });

  test("My Issues shows my backlog and started Issues by Project, in Identifier order", async ({
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
      await create("Backlog"),
      await create("Started", { stateId: project.stateId("En curso") }),
      await create("Already done", { stateId: project.stateId("Completada") }),
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
      titles("Backlog", "Started")
    );

    await archiveProject(page, prefix);
    await page.goto("/my-issues");
    await expect(
      page.getByRole("heading", { name: "Mis tareas" })
    ).toBeVisible();
    await expect(group).toBeHidden();
  });

  test("at tablet widths the Sort menu reaches the hidden date columns", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    await seedProject(page, prefix);
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.goto(`/projects/${prefix}/list`);
    await expect(
      page.getByRole("columnheader", { name: "Creada" })
    ).toBeHidden();
    await page.getByRole("button", { name: /^Orden: /u }).click();
    await page.getByRole("menuitemradio", { name: "Creada" }).click();
    await expect(page).toHaveURL(/sort=created/u);
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 1536, height: 864 });
    await expect(page.getByRole("button", { name: /^Orden: /u })).toBeHidden();

    await archiveProject(page, prefix);
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
    });

    await page.goto(`/projects/${prefix}/list`);

    await Promise.all(
      ["ID", "Título", "Responsable"].map(async (name) => {
        await expect(
          page.getByRole("columnheader", { name, exact: true })
        ).toBeVisible();
      })
    );

    await Promise.all(
      ["Estado", "Creada", "Actualizada"].map(async (name) => {
        await expect(
          page.getByRole("columnheader", { name, exact: true })
        ).toBeHidden();
      })
    );

    const overflow = await horizontalOverflow(page);

    expect(overflow, "no horizontal page scroll").toBeLessThanOrEqual(0);

    await archiveProject(page, prefix);
  });

  test("at 360px the Sort menu stays fully on screen with filters active", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    await seedProject(page, prefix);
    await page.setViewportSize({ width: 360, height: 740 });

    await page.goto(`/projects/${prefix}/list`);
    await filterUnassigned(page);

    await expect(
      page.getByRole("button", { name: /^Orden: /u })
    ).toBeInViewport({ ratio: 1 });

    await archiveProject(page, prefix);
  });

  test("the phone sort menu sorts by any field in either direction", async ({
    page,
    request,
  }) => {
    const [DONE, WAITING] = ["Finished first", "Waiting second"];
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);
    const api = apiAs(page);
    await api.issues.create({
      projectId: project.id,
      title: DONE,
      stateId: project.stateId("Completada"),
    });
    await api.issues.create({ projectId: project.id, title: WAITING });

    await page.goto(`/projects/${prefix}/list`);
    await expect(rows(page)).toHaveText(titles(DONE, WAITING));

    await page.getByRole("button", { name: /^Orden: Identificador/u }).click();
    await page.getByRole("menuitemradio", { name: "Estado" }).click();
    await expect(page).toHaveURL(/sort=state/u);
    await expect(rows(page)).toHaveText(titles(WAITING, DONE));

    // The menu stays open, so the field and the order are chosen in one go.
    await page.getByRole("menuitemradio", { name: "Descendente" }).click();
    await expect(rows(page)).toHaveText(titles(DONE, WAITING));
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Orden: Estado, descendente" })
    ).toBeVisible();

    await archiveProject(page, prefix);
  });
});

test.describe("issue neighbours", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop List.");

  test("the Issue view steps through the List it was opened from", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    await Promise.all(
      ["Alpha", "Bravo", "Charlie"].map(
        async (title) =>
          await apiAs(page).issues.create({ projectId: project.id, title })
      )
    );

    await page.goto(`/projects/${prefix}/list?sort=title&dir=desc`);
    await expect(rows(page)).toHaveText(titles("Charlie", "Bravo", "Alpha"));
    await page.getByRole("link", { name: "Charlie" }).click();

    const previous = page.getByRole("button", { name: "Tarea anterior" });
    const next = page.getByRole("button", { name: "Tarea siguiente" });
    await expect(page.getByText("1 / 3")).toBeVisible();
    await expect(previous).toBeDisabled();

    await next.click();
    await expect(page.getByRole("heading", { name: "Bravo" })).toBeVisible();
    await page.keyboard.press("j");
    await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
    await expect(next).toBeDisabled();
    await page.keyboard.press("k");
    await expect(page.getByRole("heading", { name: "Bravo" })).toBeVisible();

    await archiveProject(page, prefix);
  });
});
