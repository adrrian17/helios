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
  await page.getByRole("link", { name: "Miembros" }).click();
  await expect(
    page.getByRole("heading", { name: "Miembros", exact: true })
  ).toBeVisible();

  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar invitación" }).click();
  await expect(
    page.getByRole("list", { name: "Invitaciones pendientes" })
  ).toContainText(email);

  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviar invitación" }).click();
  await expect(
    page.getByText(`${email} ya tiene una invitación.`)
  ).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, request, email);

  await openNavigation(page, isMobile);
  await expect(page.getByRole("button", { name: "Cuenta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Miembros" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Nuevo proyecto" })
  ).toHaveCount(0);

  await page.goto("/members");
  await expect(page).not.toHaveURL(/\/members$/u);

  await page.context().clearCookies();
  await signIn(page, request, adminEmail);
  await page.goto("/members");
  await expect(page.getByRole("list", { name: "Miembros" })).toContainText(
    email
  );
  await expect(
    page.getByRole("list", { name: "Invitaciones pendientes" }).getByText(email)
  ).toHaveCount(0);
});
