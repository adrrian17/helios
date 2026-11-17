import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import {
  API_URL,
  addIssue,
  adminEmail,
  archiveProject,
  column,
  createProject,
  openNavigation,
  signIn,
  uniquePrefix,
} from "./helpers";

const IN_PROGRESS = "En curso";

const DEFAULT_STATES = [
  "Ideas",
  "Pendiente",
  IN_PROGRESS,
  "Completada",
  "Cancelada",
];

const dragTo = async (
  page: Page,
  source: Locator,
  target: { x: number; y: number }
) => {
  const box = await source.boundingBox();
  expect(box, "the card is on screen").not.toBeNull();
  const start = { x: (box?.x ?? 0) + 24, y: (box?.y ?? 0) + 12 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y + 8, { steps: 4 });
  await page.mouse.move(target.x, target.y, { steps: 20 });
  await page.mouse.up();
};

/** Resolves once the server has stored a move, so a reload shows the stored order. */
const moveSaved = async (page: Page) =>
  await page.waitForResponse(
    (response) => response.url().includes("/rpc/issues/move") && response.ok()
  );

const focusedRingColor = async (page: Page) =>
  await page.evaluate<string>(
    "getComputedStyle(document.activeElement).getPropertyValue('--tw-ring-color')"
  );

const card = (scope: Locator, identifier: string) =>
  scope.getByRole("link", { name: new RegExp(`^${identifier}(?!\\d)`, "u") });

test.describe("desktop board", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop drag and drop.");

  test("an Admin creates a Project, adds Issues and drags them across and within columns", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    await createProject(page, false, `Board ${prefix}`, prefix);

    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      DEFAULT_STATES
    );

    await addIssue(page, "Pendiente", "Write the onboarding guide");
    await expect(card(column(page, "Pendiente"), `${prefix}-1`)).toBeVisible();
    await addIssue(page, "Pendiente", "Fix the login redirect");
    await addIssue(page, "Pendiente", "Plan the launch");

    const inProgress = await column(page, IN_PROGRESS).boundingBox();
    const firstMove = moveSaved(page);
    await dragTo(page, card(column(page, "Pendiente"), `${prefix}-1`), {
      x: (inProgress?.x ?? 0) + 100,
      y: (inProgress?.y ?? 0) + 60,
    });
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeVisible();
    await firstMove;

    const second = await card(
      column(page, "Pendiente"),
      `${prefix}-2`
    ).boundingBox();

    const secondMove = moveSaved(page);
    await dragTo(page, card(column(page, "Pendiente"), `${prefix}-3`), {
      x: (second?.x ?? 0) + 40,
      y: (second?.y ?? 0) + 4,
    });
    await expect(column(page, "Pendiente").getByRole("listitem")).toHaveText([
      new RegExp(`${prefix}-3`, "u"),
      new RegExp(`${prefix}-2`, "u"),
    ]);

    await secondMove;
    await page.reload();
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeVisible();
    await expect(column(page, "Pendiente").getByRole("listitem")).toHaveText([
      new RegExp(`${prefix}-3`, "u"),
      new RegExp(`${prefix}-2`, "u"),
    ]);

    await archiveProject(page, prefix);
  });

  test("a keyboard user moves an Issue to the next column", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    await createProject(page, false, `Keys ${prefix}`, prefix);
    await addIssue(page, "Pendiente", "Keyboard move");

    await card(column(page, "Pendiente"), `${prefix}-1`).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeFocused();
    const pickedRing = await focusedRingColor(page);
    expect(pickedRing, "a picked card has a ring").not.toBe("");

    const saved = moveSaved(page);
    await page.keyboard.press("Space");
    await saved;
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeFocused();
    expect(
      await focusedRingColor(page),
      "a picked card has a different ring colour from a focused one"
    ).not.toBe(pickedRing);

    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await expect(card(column(page, "Completada"), `${prefix}-1`)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeFocused();

    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    const savedAgain = moveSaved(page);
    await page.keyboard.press("Space");
    await savedAgain;
    await expect(card(column(page, "Completada"), `${prefix}-1`)).toBeFocused();

    await page.reload();
    await expect(card(column(page, "Completada"), `${prefix}-1`)).toBeVisible();

    await archiveProject(page, prefix);
  });
});

test.describe("board composer", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop column composer.");

  test("an Issue added under filters that hide it says so, Esc returns focus, and Retry reloads the Board", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);
    await createProject(page, false, `Filtered ${prefix}`, prefix);

    await page.goto(
      `/projects/${prefix}/board?priority=${encodeURIComponent(JSON.stringify(["urgent"]))}`
    );
    const backlog = column(page, "Pendiente");

    const add = backlog.getByRole("button", {
      name: "Añadir tarea",
      exact: true,
    });

    await add.click();
    const input = backlog.getByLabel("Título de la nueva tarea en Pendiente");
    await input.fill("Hidden by filters");
    await input.press("Enter");
    await expect(
      page.getByText(`${prefix}-1 creada. Los filtros actuales la ocultan.`)
    ).toBeVisible();

    await input.press("Escape");
    await expect(add).toBeFocused();

    await page.getByRole("button", { name: "Abrir", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/issue/${prefix}-1$`, "u"));

    await page.goto(`/projects/${prefix}/board`);
    await expect(card(backlog, `${prefix}-1`)).toBeVisible();
    await page.route(`${API_URL}/rpc/issues/board`, async (route) => {
      await route.abort();
    });
    await add.click();
    await input.fill("Added offline");
    await input.press("Enter");
    await expect(
      page.getByText(/no puede conectarse con su servidor/u)
    ).toBeVisible();
    await page.unroute(`${API_URL}/rpc/issues/board`);

    const reloaded = page.waitForResponse(
      (response) =>
        response.url().includes("/rpc/issues/board") && response.ok()
    );

    await page.getByRole("button", { name: "Reintentar" }).click();
    await reloaded;
    await expect(card(backlog, `${prefix}-2`)).toBeVisible();

    await archiveProject(page, prefix);
  });
});

test.describe("phone board", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone layout.");

  test("the drawer opens, columns swipe, and Move to changes the Workflow State", async ({
    page,
    request,
  }) => {
    const prefix = uniquePrefix();
    await signIn(page, request, adminEmail);

    await openNavigation(page, true);
    await expect(page.getByRole("button", { name: "Cuenta" })).toBeVisible();
    await page.keyboard.press("Escape");

    await createProject(page, true, `Phone ${prefix}`, prefix);
    const indicator = page.getByTestId("column-indicator");
    await expect(indicator).toContainText("Ideas");

    const board = await page.getByTestId("board").boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.synthesizeScrollGesture", {
      x: Math.round((board?.x ?? 0) + (board?.width ?? 0) * 0.8),
      y: Math.round((board?.y ?? 0) + (board?.height ?? 0) * 0.6),
      xDistance: -Math.round((board?.width ?? 0) * 0.7),
      yDistance: 0,
      gestureSourceType: "touch",
      speed: 1200,
    });
    await expect(indicator).toContainText("Pendiente");

    await addIssue(page, "Pendiente", "Call the venue");
    await page.getByRole("button", { name: `Mover ${prefix}-1 a` }).click();
    const moved = moveSaved(page);
    await page.getByRole("menuitem", { name: IN_PROGRESS }).click();
    await moved;
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeAttached();

    await page.reload();
    await page.getByRole("button", { name: "Estado siguiente" }).click();
    await page.getByRole("button", { name: "Estado siguiente" }).click();
    await expect(indicator).toContainText(IN_PROGRESS);
    await expect(card(column(page, IN_PROGRESS), `${prefix}-1`)).toBeVisible();

    await archiveProject(page, prefix);
  });
});
