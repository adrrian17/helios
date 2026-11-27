import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import {
  adminEmail,
  apiAs,
  archiveProject,
  seedProject,
  signIn,
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

    await api.comments.add({ issueId: issue.id, body: "First Comment" });

    await page.goto(`/issue/${issue.identifier}`);

    const addDescription = page.getByRole("button", {
      name: "Añadir una descripción…",
    });

    await escapeReturnsFocus(page, addDescription, async () => {
      await addDescription.click();
    });

    const commentActions = page.getByRole("button", {
      name: /^Acciones del comentario de/u,
    });

    await escapeReturnsFocus(page, commentActions, async () => {
      await commentActions.click();
      await page.getByRole("menuitem", { name: "Editar" }).click();
    });

    // An earlier popover must not take focus from an editor opened through a menu.
    await page.getByRole("button", { name: "Estado: Pendiente" }).click();
    await page.getByRole("option", { name: "En curso" }).click();
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

    await archiveProject(page, prefix);
  });
});
