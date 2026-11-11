import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

export const API_URL = "https://api.helios.localhost";
export const adminEmail = process.env.ADMIN_EMAIL ?? "";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHABET_SIZE = LETTERS.length;
const PREFIX_LENGTH = 5;

/** A fresh suffix per call, since the dev database keeps every earlier run's rows. */
export const uniqueId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Five random capital letters, unlikely to clash with an earlier run's Project. */
export const uniquePrefix = () =>
  Array.from(
    { length: PREFIX_LENGTH },
    () => LETTERS[Math.floor(Math.random() * ALPHABET_SIZE)]
  ).join("");

export const capturedLinkTo = async (
  request: APIRequestContext,
  email: string
) => {
  const response = await request.get(`${API_URL}/dev/magic-link`, {
    params: { email },
  });

  expect(response.ok(), `a magic link was captured for ${email}`).toBe(true);

  return await response.text();
};

export const signIn = async (
  page: Page,
  request: APIRequestContext,
  email: string
) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "a sign-in link is on its way"
  );
  await page.goto(await capturedLinkTo(request, email));
  await expect(page).not.toHaveURL(/\/sign-in/u);
};

/** On phones the sidebar is a drawer that has to be opened first. */
export const openNavigation = async (page: Page, isMobile: boolean) => {
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
};

export const createProject = async (
  page: Page,
  isMobile: boolean,
  name: string,
  prefix: string
) => {
  await openNavigation(page, isMobile);
  await page.getByRole("button", { name: "New Project" }).first().click();

  const dialog = page.getByRole("dialog", { name: "New Project" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Identifier prefix").fill(prefix);
  await dialog.getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${prefix}/board$`, "u"));
  await expect(dialog).toBeHidden();
};

export const column = (page: Page, state: string) =>
  page.getByRole("region", { name: state, exact: true });

export const addIssue = async (page: Page, state: string, title: string) => {
  const target = column(page, state);
  const input = target.getByLabel(`New Issue title in ${state}`);

  // The input stays open after an Issue is added, ready for the next one.
  if (!(await input.isVisible())) {
    await target
      .getByRole("button", { name: "Add Issue", exact: true })
      .click();
  }

  await input.fill(title);
  await input.press("Enter");
  await expect(
    target.getByRole("link", { name: new RegExp(title, "u") })
  ).toBeVisible();
};
