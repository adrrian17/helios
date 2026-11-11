import { expect, test } from "@playwright/test";

import { API_URL, adminEmail, capturedLinkTo } from "./helpers";

test("the seeded Admin signs in with a magic link and signs out", async ({
  isMobile,
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/u);

  await page.getByLabel("Email").fill(adminEmail);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "a sign-in link is on its way"
  );

  await page.goto(await capturedLinkTo(request, adminEmail));
  await expect(page).not.toHaveURL(/\/sign-in/u);

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/u);

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/u);
});

test("an unknown email sees the same confirmation and gets no link", async ({
  page,
  request,
}) => {
  const email = "stranger@helios.localhost";
  await page.goto("/sign-in");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();

  await expect(page.getByRole("status")).toContainText(
    "a sign-in link is on its way"
  );

  const response = await request.get(`${API_URL}/dev/magic-link`, {
    params: { email },
  });

  expect(response.status()).toBe(404);
});
