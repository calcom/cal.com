import { expect } from "@playwright/test";

import { test } from "../fixtures/fixtures";
import { cleanUpForms } from "../lib/testUtils";

test.use({ storageState: `playwright/artifacts/${process.env.APP_USER_NAME}StorageState.json` });
test.describe("Forms", () => {
  test("should be able to add a new form and see it in forms list", async ({ page }) => {
    page.goto("/");
    await page.click('[href="/apps/routing_forms/forms"]');

    await page.waitForSelector('[data-testid="empty-screen"]');
    await page.click('[data-testid="new-routing-form"]');

    await page.waitForSelector('[data-testid="add-attribute"]');
    await page.click('[href="/apps/routing_forms/forms"]');
    await page.waitForSelector('[data-testid="routing-forms-list"]');
    expect(await page.locator('[data-testid="routing-forms-list"] > li').count()).toBe(1);
  });

  test("should be able to edit the form", ({ page }) => {});

  test.afterAll(() => {
    cleanUpForms();
  });
});
