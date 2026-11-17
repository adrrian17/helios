import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import {
  adminEmail,
  apiAs,
  archiveProject,
  seedProject,
  signIn,
  uniqueId,
  uniquePrefix,
} from "./helpers";

const escapeReturnsFocus = async (
  page: Page,
  opener: Locator,
  open: () => Promise<void>
) => {
  await open();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
};

test.describe("focus after closing an editor", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop keyboard flows.");

  test("every inline editor and the New Issue dialog hand focus back to their opener", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    const project = await seedProject(page, prefix);
    const api = apiAs(page);

    const issue = await api.issues.create({
      projectId: project.id,
      title: "Focus check",
    });

    await api.checklist.add({ issueId: issue.id, text: "Step one" });
    await api.comments.add({ issueId: issue.id, body: "First Comment" });

    await page.goto(`/issue/${issue.identifier}`);

    const addDescription = page.getByRole("button", {
      name: "Añadir una descripción…",
    });

    await escapeReturnsFocus(page, addDescription, async () => {
      await addDescription.click();
    });

    const step = page.getByRole("button", { name: "Step one", exact: true });
    await escapeReturnsFocus(page, step, async () => {
      await step.click();
    });

    // The Checklist edit saves on blur; focus must stay where the user moved it.
    const comment = page.getByRole("textbox", {
      name: "Comentario",
      exact: true,
    });

    await step.click();
    await comment.click();
    await expect(comment).toBeFocused();
    await step.click();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Eliminar Step one" })
    ).toBeFocused();

    const commentActions = page.getByRole("button", {
      name: /^Acciones del comentario de/u,
    });

    await escapeReturnsFocus(page, commentActions, async () => {
      await commentActions.click();
      await page.getByRole("menuitem", { name: "Editar" }).click();
    });

    // An earlier popover must not take focus from an editor opened through a menu.
    await page
      .getByRole("button", { name: "Prioridad: Sin prioridad" })
      .click();
    await page.getByRole("option", { name: "Alta" }).click();
    await commentActions.click();
    await page.getByRole("menuitem", { name: "Editar" }).click();

    const editComment = page.getByRole("textbox", {
      name: "Editar comentario",
    });

    await expect(editComment).toBeFocused();
    await page.keyboard.type(" and more");
    await expect(editComment).toHaveValue("First Comment and more");
    await page.keyboard.press("Escape");

    // A confirm opened from the menu takes focus, and gives it back on Escape.
    await commentActions.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Eliminar…" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" })
    ).toBeFocused();
    // The menu finishes closing just after the confirm opens; that is when it used to take focus back.
    expect(
      await page.evaluate<string>(
        'new Promise((done) => { setTimeout(() => { done(document.activeElement?.textContent ?? ""); }, 300); })'
      )
    ).toBe("Cancelar");
    await page.keyboard.press("Escape");
    await expect(commentActions).toBeFocused();

    const newIssue = page.getByRole("button", { name: "Nueva tarea" });
    await escapeReturnsFocus(page, newIssue, async () => {
      await newIssue.click();
      await expect(
        page.getByRole("dialog").getByLabel("Título", { exact: true })
      ).toBeFocused();
    });

    await page.goto(`/projects/${prefix}/settings`);

    const stateActions = page.getByRole("button", {
      name: "Más acciones para Pendiente",
    });

    await escapeReturnsFocus(page, stateActions, async () => {
      await stateActions.click();
      await page.getByRole("menuitem", { name: "Renombrar" }).click();
    });

    const addState = page.getByRole("button", {
      name: "Añadir un estado a Ideas",
    });

    await escapeReturnsFocus(page, addState, async () => {
      await addState.click();
    });

    const name = `Label ${uniqueId()}`;
    await page.goto("/labels");
    await page.getByLabel("Nombre").fill(name);
    await page.getByRole("button", { name: "Crear etiqueta" }).click();

    const labelActions = page.getByRole("button", {
      name: `Acciones para ${name}`,
    });

    await escapeReturnsFocus(page, labelActions, async () => {
      await labelActions.click();
      await page.getByRole("menuitem", { name: "Renombrar" }).click();
    });

    await labelActions.click();
    await page.getByRole("menuitem", { name: "Eliminar…" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Eliminar etiqueta" })
      .click();
    await archiveProject(page, prefix);
  });
});
