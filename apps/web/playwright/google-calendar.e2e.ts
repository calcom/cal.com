/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "@playwright/test";

import { IS_PRODUCTION, IS_SELF_HOSTED } from "@calcom/lib/constants";

import { test } from "./lib/fixtures";
import { installGoogleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

const GOOGLE_CALENDAR_EMAIL = process.env.E2E_TEST_GOOGLE_CALENDAR_EMAIL!;
const GOOGLE_CALENDAR_PASSWORD = process.env.E2E_TEST_GOOGLE_CALENDAR_PASSWORD!;
const GOOGLE_APPNAME = process.env.E2E_TEST_GOOGLE_AUTH_CONSENT_APPNAME!;

const SHOULD_FAIL_TESTS = !GOOGLE_CALENDAR_EMAIL || !GOOGLE_CALENDAR_PASSWORD || !GOOGLE_APPNAME;

test.afterEach(async ({ users, page }) => {
  await page.goto("https://myaccount.google.com/connections?filters=2");
  await page.locator(`a:has-text("${GOOGLE_APPNAME}")`).click();
  await page.locator(`div[data-name="${GOOGLE_APPNAME}"][role="button"]`).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await users.deleteAll();
});

test.describe("Google Calendar", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(IS_SELF_HOSTED && IS_PRODUCTION, "Skipping for Self Hosted in Production");
  expect(SHOULD_FAIL_TESTS).toBeFalsy();

  test("Should be able to install and login on Google Calendar", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await installGoogleCalendar(page);

    // wait for https://accounts.google.com
    await page.waitForURL((url) => url.hostname === "accounts.google.com");

    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', GOOGLE_CALENDAR_EMAIL);
    await page.click("#identifierNext");

    // password page
    await page.waitForSelector('#password input[type="password"]');
    await page.type('#password input[type="password"]', GOOGLE_CALENDAR_PASSWORD);
    await page.click("#passwordNext");

    // this is needed because I have an test app that is not verified by Google
    // await page.waitForURL(/\/warning/);

    await page.waitForURL((url) => url.pathname.includes("/warning"));
    await page.getByRole("button", { name: "Continue" }).click();

    await page.waitForSelector("#submit_approve_access");

    // allowing all permissions that our app requests
    await page.getByText("Select all").click();
    await page.click("#submit_approve_access");

    await page.waitForURL("apps/installed/calendar?category=calendar");

    await expect(page.locator(`label[for="${GOOGLE_CALENDAR_EMAIL}"]`)).toBeVisible();
  });
});
