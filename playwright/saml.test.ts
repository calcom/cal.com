import { test } from "@playwright/test";

// Using logged in state from globalSteup
test.use({ storageState: "playwright/artifacts/proStorageState.json" });

test("test SAML configuration UI with pro@example.com", async ({ page }) => {
  // Try to go Security page
  await page.goto("/settings/security");
  // It should redirect you to the event-types page
  await page.waitForSelector("[data-testid=saml_config]");
});
