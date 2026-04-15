import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { test } from "./lib/fixtures";

async function testDuplicateAPICalls(
  page: Page,
  url: string,
  testDate?: Date
): Promise<{ totalCalls: number; trpcCalls: number; apiV2Calls: number }> {
  const trpcCalls: string[] = [];
  const apiV2Calls: string[] = [];

  if (testDate) {
    await page.clock.install({ time: testDate });
  }

  await page.route("**/api/trpc/slots/getSchedule**", async (route) => {
    trpcCalls.push(route.request().url());
    await route.continue();
  });

  await page.route("**/api/v2/slots/available**", async (route) => {
    apiV2Calls.push(route.request().url());
    await route.continue();
  });

  await page.goto(url);
  await page.waitForTimeout(5000);

  return {
    totalCalls: trpcCalls.length + apiV2Calls.length,
    trpcCalls: trpcCalls.length,
    apiV2Calls: apiV2Calls.length,
  };
}

/**
 * Creates a stable test date that avoids month boundary issues.
 * Uses a fixed date in the middle of a month to ensure consistent behavior
 * regardless of when the test is run.
 * @param dayOfMonth - The day of the month to use (5 for beginning, 20 for end)
 */
function getStableTestDate(dayOfMonth: number): Date {
  // Use a fixed future date to avoid any issues with past dates or month boundaries
  // July 2030 is chosen as it's far in the future and has no special calendar quirks
  return new Date(2030, 6, dayOfMonth, 12, 0, 0);
}

test.describe("Duplicate API Calls Prevention", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test("should detect when schedule endpoints are called multiple times for individual user events - beginning of month", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "30-min");
    const beginningOfMonth = getStableTestDate(5);

    const { totalCalls, trpcCalls, apiV2Calls } = await testDuplicateAPICalls(
      page,
      `/${user.username}/${eventType?.slug}`,
      beginningOfMonth
    );

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls).toBeLessThanOrEqual(1);
    expect(apiV2Calls).toBeLessThanOrEqual(1);
  });

  test("should detect when schedule endpoints are called multiple times for individual user events - end of month", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "30-min");
    const endOfMonth = getStableTestDate(20);

    const { totalCalls, trpcCalls, apiV2Calls } = await testDuplicateAPICalls(
      page,
      `/${user.username}/${eventType?.slug}`,
      endOfMonth
    );

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls).toBeLessThanOrEqual(1);
    expect(apiV2Calls).toBeLessThanOrEqual(1);
  });

});
