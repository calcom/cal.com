import { test } from "@playwright/test";

import { IS_SAML_LOGIN_ENABLED } from "../server/lib/constants";

test.describe("SAML tests", () => {
  // Using logged in state from globalSteup
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test("test SAML configuration UI with pro@example.com", async ({ page }) => {
    test.skip(!IS_SAML_LOGIN_ENABLED, "It should only run if SAML is enabled");
    // Try to go Security page
    await page.goto("/settings/security");
    // It should redirect you to the event-types page
    await page.waitForSelector("[data-testid=saml_config]");
  });
});
