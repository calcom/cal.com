import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test("Icons render properly", async ({ page }) => {
  await page.goto("/icons");
  await expect(page).toHaveScreenshot();
});
