/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { installCaldavCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

const CALDAV_CALENDER_URL = process.env.E2E_TEST_CALDAV_CALENDER_URL!;
const CALDAV_CALENDAR_USERNAME = process.env.E2E_TEST_CALDAV_CALENDAR_USERNAME!;
const CALDAV_CALENDAR_PASSWORD = process.env.E2E_TEST_CALDAV_CALENDAR_PASSWORD!;

const SHOULD_SKIP_TESTS = !CALDAV_CALENDER_URL || !CALDAV_CALENDAR_USERNAME || !CALDAV_CALENDAR_PASSWORD;

test.describe("CalDav Calendar", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(SHOULD_SKIP_TESTS, "Skipping 'CalDav Calendar' tests due to missing CalDav credentials");

  test("Should be able to install and login on CalDav Calendar", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await installCaldavCalendar(page);

    await expect(page.locator('[data-testid="caldav-calendar-form"]')).toBeVisible();

    await page.fill('[data-testid="caldav-calendar-url"]', CALDAV_CALENDER_URL);
    await page.fill('[data-testid="caldav-calendar-username"]', CALDAV_CALENDAR_USERNAME);
    await page.fill('[data-testid="caldav-calendar-password"]', CALDAV_CALENDAR_PASSWORD);
    await page.click('[data-testid="caldav-calendar-save-button"]');

    await page.waitForURL("/apps/installed/calendar?category=calendar");

    await expect(page.getByText("CalDav (Beta) - Calendar")).toBeVisible();
    await expect(page.getByText(CALDAV_CALENDAR_USERNAME)).toBeVisible();
  });
});
