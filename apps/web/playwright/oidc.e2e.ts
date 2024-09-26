/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from "./lib/fixtures";

const SAML_DATABASE_URL = process.env.SAML_DATABASE_URL!;
const SAML_ADMINS = process.env.SAML_ADMINS!;
const SAML_ADMIN_EMAIL = process.env.E2E_TEST_SAML_ADMIN_EMAIL!;
const SAML_ADMIN_PASSWORD = process.env.E2E_TEST_SAML_ADMIN_PASSWORD!;
const OIDC_CLIENT_ID = process.env.E2E_TEST_OIDC_CLIENT_ID!;
const OIDC_CLIENT_SECRET = process.env.E2E_TEST_OIDC_CLIENT_SECRET!;
const OIDC_PROVIDER_DOMAIN = process.env.E2E_TEST_OIDC_PROVIDER_DOMAIN!;
const OIDC_USER_EMAIL = process.env.E2E_TEST_OIDC_USER_EMAIL!;
const OIDC_USER_PASSWORD = process.env.E2E_TEST_OIDC_USER_PASSWORD!;

const SHOULD_SKIP_TESTS =
  !SAML_DATABASE_URL ||
  !SAML_ADMINS ||
  !SAML_ADMIN_EMAIL ||
  !SAML_ADMIN_PASSWORD ||
  !OIDC_CLIENT_ID ||
  !OIDC_CLIENT_SECRET ||
  !OIDC_PROVIDER_DOMAIN ||
  !OIDC_USER_EMAIL ||
  !OIDC_USER_PASSWORD;

test.afterEach(({ users }) => users.deleteAll());
// TODO: Cleanup the OIDC connection after the tests with fixtures
test.describe("OIDC", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(SHOULD_SKIP_TESTS, "Skipping due to missing the testing variables");
  test("Setup with SAML admin and login", async ({ page, users }) => {
    // Add the admin user provided in the environment variables to the db
    const samlAdminUser = await users.create({ email: SAML_ADMIN_EMAIL, password: SAML_ADMIN_PASSWORD });
    await samlAdminUser.apiLogin();
    await test.step("Connect with OIDC Provider", async () => {
      await page.goto("/settings/security/sso");
      await page.click('[data-testid="sso-oidc-configure"]');
      await page.fill('[data-testid="sso-oidc-client-id"]', OIDC_CLIENT_ID);
      await page.fill('[data-testid="sso-oidc-client-secret"]', OIDC_CLIENT_SECRET);
      await page.fill(
        '[data-testid="sso-oidc-well-known-url"]',
        `https://${OIDC_PROVIDER_DOMAIN}/.well-known/openid-configuration`
      );
      await page.click('[data-testid="sso-oidc-save"]');
      await page.waitForSelector('[data-testid="toast-success"]');
    });
    // Logout the SAML Admin
    await samlAdminUser.logout();
    await test.step("Login using the OIDC provider", async () => {
      // Login a user using the OIDC provider.
      // The credentials are handled by the provider, so we don't need to create a user in the db.
      await page.goto("/auth/login");
      await page.click('[data-testid="samlAndOidc"]');
      // Redirected outide of the app, the user would be redirected to the OIDC provider.
      await page.waitForURL(/https:\/\/[^/]+\/oauth2\/v1\/authorize\?.*/);
      await page.getByRole("textbox", { name: "Username" }).fill(OIDC_USER_EMAIL);
      await page.getByRole("textbox", { name: "Password" }).fill(OIDC_USER_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
      // The user is redirected back to the app.
      await page.waitForURL("getting-started", { waitUntil: "load" });
    });
    // Logout the user.
    await page.goto("/auth/logout");
    await test.step("Disconnect OIDC Provider", async () => {
      samlAdminUser.apiLogin();
      await page.goto("/settings/security/sso", { waitUntil: "load" });
      await page.getByTestId("delete-oidc-sso-connection").click();
      await page.getByRole("button", { name: "Yes, delete OIDC configuration" }).click();
      await page.waitForSelector('[data-testid="toast-success"]');
    });
  });
});
