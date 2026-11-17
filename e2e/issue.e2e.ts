import { expect, test } from "@playwright/test";
import type { Route } from "@playwright/test";

import {
  API_URL,
  adminEmail,
  apiAs,
  archiveProject,
  horizontalOverflow,
  seedProject,
  signIn,
  uniqueId,
  uniquePrefix,
} from "./helpers";

const WRITE_TESTS = "Write tests";
const IN_PROGRESS_STATE = "Estado: En curso";
const ACTIVITY = "Actividad y comentarios";
const SEND = "ControlOrMeta+Enter";

test.describe("issue view", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop Issue view.");

  test("state, Priority, a Comment and the Checklist persist after reload", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Edit me",
    });

    await page.goto(`/issue/${issue.identifier}`);

    await page.getByRole("button", { name: "Estado: Pendiente" }).click();
    await page.getByRole("option", { name: "En curso" }).click();
    await expect(
      page.getByRole("button", { name: IN_PROGRESS_STATE })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Prioridad: Sin prioridad" })
      .click();
    await page.getByRole("option", { name: "Alta" }).click();
    await expect(
      page.getByRole("button", { name: "Prioridad: Alta" })
    ).toBeVisible();

    const newItem = page.getByLabel("Nuevo elemento del checklist");
    await newItem.fill(WRITE_TESTS);
    await newItem.press("Enter");
    await expect(
      page.getByRole("checkbox", { name: WRITE_TESTS })
    ).toBeVisible();
    await newItem.fill("Ship it");
    await newItem.press("Enter");
    await expect(page.getByRole("checkbox", { name: "Ship it" })).toBeVisible();
    await page.getByRole("checkbox", { name: WRITE_TESTS }).click();
    await expect(page.getByText("1/2")).toBeVisible();

    const comment = `Looks good ${uniqueId()}`;
    await page
      .getByRole("textbox", { name: "Comentario", exact: true })
      .fill(comment);
    await page.getByRole("button", { name: "Comentar", exact: true }).click();
    await expect(page.getByRole("article")).toContainText(comment);

    await page.reload();

    await expect(
      page.getByRole("button", { name: IN_PROGRESS_STATE })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Prioridad: Alta" })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: WRITE_TESTS })
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Ship it" })
    ).not.toBeChecked();
    await expect(page.getByText("1/2")).toBeVisible();
    await expect(
      page.getByRole("article", { name: /Comentario de/u })
    ).toContainText(comment);

    const activity = page.getByRole("list", { name: ACTIVITY });
    await expect(activity).toContainText("la movió de Pendiente a En curso");
    await expect(activity).toContainText(
      "cambió la prioridad de Sin prioridad a Alta"
    );

    await archiveProject(page, prefix);
  });

  test("pickers open on the current value, a rename shows old and new, ⌘↵ sends once and drafts stay with their Issue", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);
    const api = apiAs(page);

    const first = await api.issues.create({
      projectId: project.id,
      title: "Old name",
    });

    const second = await api.issues.create({
      projectId: project.id,
      title: "The other Issue",
    });

    await page.goto(`/issue/${first.identifier}`);
    const activity = page.getByRole("list", { name: ACTIVITY });

    const title = page.getByRole("textbox", { name: "Título" });
    await title.fill("New name");
    await title.press("Enter");
    await expect(activity).toContainText(
      "renombró la tarea de Old name a New name"
    );

    await page.getByRole("heading", { name: "Actividad" }).click();
    await page.keyboard.press("s");
    await expect(
      page.getByRole("option", { name: "Pendiente" })
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "Mover a" })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Estado: Pendiente" })
    ).toBeVisible();
    await expect(activity).not.toContainText("la movió");

    const comment = page.getByRole("textbox", {
      name: "Comentario",
      exact: true,
    });

    const once = `Only once ${uniqueId()}`;
    await comment.fill(once);
    await comment.press(SEND);
    await comment.press(SEND);
    await expect(comment).toHaveValue("");
    await page.reload();
    await expect(
      page.getByRole("article").filter({ hasText: once })
    ).toHaveCount(1);

    await comment.fill("A draft for the first Issue");
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Paleta de comandos" });
    await palette.getByRole("combobox").fill(second.identifier);
    await expect(palette.getByRole("option").first()).toContainText(
      second.identifier
    );
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "The other Issue" })
    ).toBeVisible();
    await expect(comment).toHaveValue("");

    await archiveProject(page, prefix);
  });

  test("text typed while a Comment sends survives, and a failed title save keeps the typed title", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Slow network",
    });

    await page.goto(`/issue/${issue.identifier}`);

    // Held until the next Comment is typed, so the first one is still sending.
    const held: Route[] = [];
    await page.route(`${API_URL}/rpc/comments/add`, (route) => {
      held.push(route);
    });

    const comment = page.getByRole("textbox", {
      name: "Comentario",
      exact: true,
    });

    const first = `Sent first ${uniqueId()}`;
    await comment.fill(first);
    await comment.press(SEND);
    await expect.poll(() => held.length).toBe(1);
    await comment.fill("Typed while the first one sends");
    await held[0]?.continue();
    await expect(
      page.getByRole("article").filter({ hasText: first })
    ).toBeVisible();
    await expect(comment).toHaveValue("Typed while the first one sends");

    await page.route(`${API_URL}/rpc/issues/update`, async (route) => {
      await route.abort();
    });

    const title = page.getByRole("textbox", { name: "Título" });
    await title.fill("Typed offline");
    await title.press("Enter");
    await expect(
      page.getByText(/no puede conectarse con su servidor/u)
    ).toBeVisible();
    await expect(title).toHaveValue("Typed offline");

    await page.unroute(`${API_URL}/rpc/issues/update`);

    await page.route(`${API_URL}/rpc/issues/update`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          json: {
            defined: false,
            code: "INTERNAL_SERVER_ERROR",
            status: 500,
            message: "Internal server error",
          },
        }),
      });
    });
    await title.press("Enter");
    await expect(page.getByText(/Algo salió mal en Helios/u)).toBeVisible();
    await page.unroute(`${API_URL}/rpc/issues/update`);
    await title.press("Enter");
    await expect(page.getByRole("list", { name: ACTIVITY })).toContainText(
      "renombró la tarea de Slow network a Typed offline"
    );

    const newItem = page.getByLabel("Nuevo elemento del checklist");
    await newItem.fill("Step one");
    await newItem.press("Enter");
    await expect(
      page.getByRole("checkbox", { name: "Step one" })
    ).toBeVisible();
    await page.route(`${API_URL}/rpc/checklist/update`, async (route) => {
      await route.abort();
    });
    const editStep = page.getByLabel("Editar Step one");
    await page.getByRole("button", { name: "Step one", exact: true }).click();
    await editStep.fill("Renamed offline");
    await editStep.press("Enter");
    await expect(editStep).toHaveValue("Renamed offline");
    await page.unroute(`${API_URL}/rpc/checklist/update`);

    await archiveProject(page, prefix);
  });

  test("Markdown in a description renders, and HTML in it never runs", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Hostile description",
    });

    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto(`/issue/${issue.identifier}`);
    await page.getByRole("button", { name: "Añadir una descripción…" }).click();
    await page
      .getByRole("textbox", { name: "Descripción" })
      .fill(
        [
          "**Bold** and a [link](https://example.com).",
          "",
          "<script>alert('script')</script>",
          "",
          '<img src="x" onerror="alert(\'img\')">',
          "",
          "[trap](javascript:alert('link'))",
        ].join("\n")
      );
    await page.getByRole("button", { name: "Guardar" }).click();

    const description = page.getByRole("region", { name: "Descripción" });
    await expect(description.locator("strong")).toHaveText("Bold");
    await page.reload();
    await expect(description.locator("strong")).toHaveText("Bold");

    await expect(description.locator("script, img, [onerror]")).toHaveCount(0);
    await expect(
      description.getByRole("link", { name: "link" })
    ).toHaveAttribute("href", "https://example.com");
    await expect(description.locator('a[href^="javascript:"]')).toHaveCount(0);

    await description.getByText("trap").click();
    expect(dialogs, "no script ran").toStrictEqual([]);

    await archiveProject(page, prefix);
  });
});

test.describe("labels", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop Labels page.");

  test("a Label is created, refused when the name differs only in case, and deleted", async ({
    page,
    request,
  }) => {
    const name = `Label ${uniqueId()}`;
    await signIn(page, request, adminEmail);
    await page.goto("/labels");

    await page.getByLabel("Nombre").fill(name);
    await page.getByRole("button", { name: "Crear etiqueta" }).click();
    await expect(page.getByRole("list", { name: "Etiquetas" })).toContainText(
      name
    );

    await page.getByLabel("Nombre").fill(name.toUpperCase());
    await page.getByRole("button", { name: "Crear etiqueta" }).click();
    await expect(page.getByText("Ya existe una etiqueta")).toBeVisible();

    await page.getByRole("button", { name: `Acciones para ${name}` }).click();
    await page.getByRole("menuitem", { name: "Eliminar…" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Eliminar etiqueta" })
      .click();
    await expect(
      page.getByRole("list", { name: "Etiquetas" })
    ).not.toContainText(name);
  });
});

test.describe("phone issue view", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone layout.");

  test("Move to changes the Workflow State and the page never scrolls sideways", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);

    const issue = await apiAs(page).issues.create({
      projectId: project.id,
      title: "Move me from a phone",
    });

    await page.goto(`/issue/${issue.identifier}`);
    await page.getByRole("button", { name: "Acciones de la tarea" }).click();
    await page.getByRole("menuitem", { name: "Mover a…" }).click();
    await page.getByRole("option", { name: "En curso" }).click();
    await expect(
      page.getByRole("button", { name: IN_PROGRESS_STATE })
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("button", { name: IN_PROGRESS_STATE })
    ).toBeVisible();

    const overflow = await horizontalOverflow(page);

    expect(overflow, "no horizontal page scroll").toBeLessThanOrEqual(0);

    await archiveProject(page, prefix);
  });

  test("a 120-character Workflow State name leaves Priority and assignee on screen and tappable at 360px", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);
    const api = apiAs(page);

    const { id: stateId } = await api.workflowStates.add({
      projectId: project.id,
      name: "Waiting on review ".repeat(7).slice(0, 120),
      category: "started",
    });

    const issue = await api.issues.create({
      projectId: project.id,
      title: "Long state name",
      stateId,
    });

    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/issue/${issue.identifier}`);

    await Promise.all(
      [/^Prioridad:/u, /^Responsable:/u].map(async (name) => {
        const chip = page.getByRole("button", { name });
        await expect(chip, `${String(name)} is on screen`).toBeInViewport({
          ratio: 1,
        });
        const box = await chip.boundingBox();

        expect(
          box?.width,
          `${String(name)} is 44px wide`
        ).toBeGreaterThanOrEqual(44);
        expect(
          box?.height,
          `${String(name)} is 44px tall`
        ).toBeGreaterThanOrEqual(44);
      })
    );

    expect(
      await horizontalOverflow(page),
      "no horizontal page scroll"
    ).toBeLessThanOrEqual(0);

    await archiveProject(page, prefix);
  });
});
