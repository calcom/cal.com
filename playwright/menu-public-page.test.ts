import { test, expect } from "@playwright/test";

// Using logged in state from globalSteup
test.use({ storageState: "playwright/artifacts/proStorageState.json" });

test("test menu public page", async ({ page }) => {
  // Go to public page
  await page.goto("/pro");
  let pageTitle = await page.title();
  expect(pageTitle).toMatch('Pro Example');
});
