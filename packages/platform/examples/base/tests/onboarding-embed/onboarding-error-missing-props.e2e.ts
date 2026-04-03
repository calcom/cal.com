import { test, expect } from "@playwright/test";

import { continueWithCalButton, getErrorOutput } from "./helpers";

test.describe("Onboarding Error — Missing Props", () => {
  test("INVALID_PROPS — onError fires when required props are missing", async ({ page }) => {
    await page.goto("/e2e/onboarding-error-missing-props");

    const error = await getErrorOutput(page);
    expect(error.code).toBe("INVALID_PROPS");
    expect(error.message).toContain("missing required props");
    expect(error.message).toContain("oAuthClientId");
    expect(error.message).toContain("authorization.redirectUri");
    expect(error.message).toContain("authorization.state");
    expect(error.message).toContain("authorization.scope");

    await expect(continueWithCalButton(page)).not.toBeVisible();
  });
});
