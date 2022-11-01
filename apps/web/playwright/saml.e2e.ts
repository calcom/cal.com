import { IS_SAML_LOGIN_ENABLED } from "../server/lib/constants";
import { login } from "./fixtures/users";
import { test } from "./lib/fixtures";

test.describe("SAML tests", () => {
  test("test SAML configuration UI with pro@example.com", async ({ page }) => {
    // TODO: Figure out a way to use the users from fixtures here, right now we cannot set
    // the SAML_ADMINS env variables dynamically
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_SAML_LOGIN_ENABLED, "It should only run if SAML is enabled");
    // Try to go Security page
    await page.goto("/settings/security/sso");
    // It should redirect you to the event-types page
    // await page.waitForSelector("[data-testid=saml_config]");
  });
});
