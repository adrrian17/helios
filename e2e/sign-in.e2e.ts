import { expect, test } from "@playwright/test";

import { API_URL, adminEmail, capturedLinkTo } from "./helpers";

test("the seeded Admin signs in with a magic link and signs out", async ({
  isMobile,
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/u);

  await page.getByLabel("Correo electrónico").fill(adminEmail);
  await page
    .getByRole("button", { name: "Enviarme un enlace de acceso" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "enlace de acceso va en camino"
  );
  // Focus moves to the confirmation, so it is read out and not lost with the form.
  await expect(page.getByRole("status")).toBeFocused();

  await page.goto(await capturedLinkTo(request, adminEmail));
  await expect(page).not.toHaveURL(/\/sign-in/u);

  if (isMobile) {
    await page.getByRole("button", { name: "Abrir navegación" }).click();
  }

  // A failed sign-out keeps the session, so the app must not pretend it ended.
  await page.route("**/sign-out", async (route) => {
    await route.fulfill({ status: 500 });
  });
  await page.getByRole("button", { name: "Cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByText("No se pudo cerrar la sesión. Inténtalo de nuevo.")
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/sign-in/u);
  await page.unroute("**/sign-out");

  if (isMobile) {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Abrir navegación" }).click();
  }

  await page.getByRole("button", { name: "Cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
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

  await page.getByLabel("Correo electrónico").fill(email);
  await page
    .getByRole("button", { name: "Enviarme un enlace de acceso" })
    .click();

  await expect(page.getByRole("status")).toContainText(
    "enlace de acceso va en camino"
  );

  const response = await request.get(`${API_URL}/dev/magic-link`, {
    params: { email },
  });

  expect(response.status()).toBe(404);
});
