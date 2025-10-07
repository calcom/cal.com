import { test, expect } from "@playwright/test";

test.describe("Individual event type settings", () => {
  test("Basics tab", async ({ page }) => {
    await page.goto("/");
    await page.goto("/event-types");

    await expect(page).toHaveURL("/event-types");
    await expect(page.locator("body")).toBeVisible();
  });
});
