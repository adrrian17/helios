import { expect, test } from "@playwright/test";

import { adminEmail, openNavigation, signIn, uniqueId } from "./helpers";

test("an invited person signs in as a Member and sees no Admin actions", async ({
  isMobile,
  page,
  request,
}) => {
  const email = `member-${uniqueId()}@helios.localhost`;

  await signIn(page, request, adminEmail);
  await openNavigation(page, isMobile);
  await page.getByRole("link", { name: "Members" }).click();
  await expect(
    page.getByRole("heading", { name: "Members", exact: true })
  ).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(
    page.getByRole("list", { name: "Pending Invitations" })
  ).toContainText(email);

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(`${email} is already invited.`)).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, request, email);

  await openNavigation(page, isMobile);
  await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Members" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New Project" })).toHaveCount(
    0
  );

  await page.goto("/members");
  await expect(page).not.toHaveURL(/\/members$/u);

  await page.context().clearCookies();
  await signIn(page, request, adminEmail);
  await page.goto("/members");
  await expect(page.getByRole("list", { name: "Members" })).toContainText(
    email
  );
  await expect(
    page.getByRole("list", { name: "Pending Invitations" }).getByText(email)
  ).toHaveCount(0);
});
