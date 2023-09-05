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

test.afterAll(({ users }) => users.deleteAll());
// TODO: Delete OIDC provider at the end of the test
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
  });
});
