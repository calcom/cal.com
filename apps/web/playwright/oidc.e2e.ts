/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from "./lib/fixtures";

const SAML_DATABASE_URL = process.env.SAML_DATABASE_URL!;
const SAML_ADMINS = process.env.SAML_ADMINS!;
const SAML_ADMIN_EMAIL = process.env.E2E_TEST_SAML_ADMIN_EMAIL!;
const SAML_ADMIN_PASSWORD = process.env.E2E_TEST_SAML_ADMIN_PASSWORD!;
const OIDC_CLIENT_ID = process.env.E2E_TEST_OIDC_CLIENT_ID!;
const OIDC_CLIENT_SECRET = process.env.E2E_TEST_OIDC_CLIENT_SECRET!;

const SHOULD_SKIP_TESTS =
  !SAML_DATABASE_URL ||
  !SAML_ADMINS ||
  !SAML_ADMIN_EMAIL ||
  !SAML_ADMIN_PASSWORD ||
  !OIDC_CLIENT_ID ||
  !OIDC_CLIENT_SECRET;

test.describe("OIDC", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(SHOULD_SKIP_TESTS, "Skipping due to missing the testing variables");
  test("Setup OIDC with SAML admin", async ({ page, users }) => {
    const user = await users.create({ email: SAML_ADMIN_EMAIL, password: SAML_ADMIN_PASSWORD });
    await user.apiLogin();
    await page.goto("/settings/security/sso");
    await page.click('[data-testid="sso-oidc-configure"]');
    await page.fill('[data-testid="sso-oidc-client-id"]', OIDC_CLIENT_ID);
    await page.fill('[data-testid="sso-oidc-client-secret"]', OIDC_CLIENT_SECRET);
  });
});
