/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { installGoogleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

const GOOGLE_CALENDAR_EMAIL = process.env.E2E_TEST_GOOGLE_CALENDAR_EMAIL!;
const GOOGLE_CALENDAR_PASSWORD = process.env.E2E_TEST_GOOGLE_CALENDAR_PASSWORD!;

const SHOULD_SKIP_TESTS = !GOOGLE_CALENDAR_EMAIL || !GOOGLE_CALENDAR_PASSWORD;

test.describe("Google Calendar", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(SHOULD_SKIP_TESTS, "Skipping due to missing the testing credentials");

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
    await page.getByText("Continue").click();

    await page.waitForSelector("#submit_approve_access");

    // allowing all permissions that our app requests
    await page.getByText("Select all").click();
    await page.click("#submit_approve_access");

    await page.waitForURL("api/integrations/googlecalendar/callback");

    await expect(page.getByText("Google Calendar")).toBeVisible();
    await expect(page.getByText(GOOGLE_CALENDAR_EMAIL)).toBeVisible();
  });
});
