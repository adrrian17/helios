import { expect, test } from "@playwright/test";

import {
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
const IN_PROGRESS_STATE = "Workflow State: In Progress";

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

    await page.getByRole("button", { name: "Workflow State: Backlog" }).click();
    await page.getByRole("option", { name: "In Progress" }).click();
    await expect(
      page.getByRole("button", { name: IN_PROGRESS_STATE })
    ).toBeVisible();

    await page.getByRole("button", { name: "Priority: No priority" }).click();
    await page.getByRole("option", { name: "High" }).click();
    await expect(
      page.getByRole("button", { name: "Priority: High" })
    ).toBeVisible();

    const newItem = page.getByLabel("New Checklist item");
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
      .getByRole("textbox", { name: "Comment", exact: true })
      .fill(comment);
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(page.getByRole("article")).toContainText(comment);

    await page.reload();

    await expect(
      page.getByRole("button", { name: IN_PROGRESS_STATE })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Priority: High" })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: WRITE_TESTS })
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Ship it" })
    ).not.toBeChecked();
    await expect(page.getByText("1/2")).toBeVisible();
    await expect(
      page.getByRole("article", { name: /Comment by/u })
    ).toContainText(comment);

    const activity = page.getByRole("list", { name: "Activity and Comments" });
    await expect(activity).toContainText(
      "moved it from Backlog to In Progress"
    );
    await expect(activity).toContainText(
      "changed Priority from No priority to High"
    );

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
    await page.getByRole("button", { name: "Add a description…" }).click();
    await page
      .getByRole("textbox", { name: "Description" })
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
    await page.getByRole("button", { name: "Save" }).click();

    const description = page.getByRole("region", { name: "Description" });
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

    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Create Label" }).click();
    await expect(page.getByRole("list", { name: "Labels" })).toContainText(
      name
    );

    await page.getByLabel("Name").fill(name.toUpperCase());
    await page.getByRole("button", { name: "Create Label" }).click();
    await expect(page.getByText("already exists")).toBeVisible();

    await page.getByRole("button", { name: `Actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Delete…" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Label" })
      .click();
    await expect(page.getByRole("list", { name: "Labels" })).not.toContainText(
      name
    );
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
    await page.getByRole("button", { name: "Issue actions" }).click();
    await page.getByRole("menuitem", { name: "Move to…" }).click();
    await page.getByRole("option", { name: "In Progress" }).click();
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
});
