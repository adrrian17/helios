import type { AppRouterClient } from "@helios/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

export const API_URL = "https://api.helios.localhost";
const WEB_URL = "https://helios.localhost";
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

/** Archives the Project through its settings, so test runs do not pile up in the sidebar. */
export const archiveProject = async (page: Page, prefix: string) => {
  await page.goto(`/projects/${prefix}/settings`);
  await page.getByRole("button", { name: "Archive Project" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Archive Project" })
    .click();
  await expect(
    page.getByRole("button", { name: "Unarchive Project" })
  ).toBeVisible();
  await page.goto("/projects/archived");
  await expect(
    page.getByRole("list", { name: "Archived Projects" })
  ).toContainText(prefix);
};

/**
 * A typed API client acting as the page's signed-in Member, through the
 * page's own cookies; for setup the journey under test does not cover.
 */
export const apiAs = (page: Page): AppRouterClient =>
  createORPCClient(
    new RPCLink({
      url: `${API_URL}/rpc`,
      headers: { origin: WEB_URL },
      fetch: async (request) => {
        const response = await page.request.fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers),
          data: await request.text(),
        });

        return new Response(await response.body(), {
          status: response.status(),
          headers: response.headers(),
        });
      },
    })
  );

/** Creates a Project through the API; `stateId` looks up its Workflow States by name. */
export const seedProject = async (page: Page, prefix: string) => {
  const api = apiAs(page);
  const { id } = await api.projects.create({ name: `Seed ${prefix}`, prefix });
  const { states } = await api.projects.get({ prefix });

  const stateId = (name: string) => {
    const state = states.find((entry) => entry.name === name);

    if (state === undefined) {
      throw new Error(`No Workflow State named ${name}`);
    }

    return state.id;
  };

  return { id, stateId };
};

/** How far the page is wider than the viewport; above zero means it scrolls sideways. */
export const horizontalOverflow = async (page: Page) =>
  await page.evaluate<number>(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth"
  );

/**
 * Assigns an Issue to the signed-in Admin through the Issue view. The API
 * route would hand back the Admin's email, which Varlock treats as a leak.
 */
export const assignToAdmin = async (page: Page, identifier: string) => {
  await page.goto(`/issue/${identifier}`);
  await page.getByRole("button", { name: "Assignee: Unassigned" }).click();
  await page.getByRole("option", { name: adminEmail, exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Assignee: ${adminEmail}` })
  ).toBeVisible();
};
