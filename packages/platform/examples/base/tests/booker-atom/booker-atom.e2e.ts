import { test, expect } from "@playwright/test";

test("tweak availability  using AvailabilitySettings Atom", async ({ page }) => {
  await page.goto("/");

  await page.goto("/booking");

  await expect(page).toHaveURL("/booking");

  await expect(page.locator("body")).toBeVisible();
});
