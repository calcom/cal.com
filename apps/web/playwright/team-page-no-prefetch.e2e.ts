import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

/**
 * Tests that the team page does not prefetch event type pages on load.
 * This is important to prevent excessive API calls (especially to Google Calendar)
 * when teams have many event types.
 *
 * The fix adds `prefetch={false}` to Link components in team-view.tsx,
 * which prevents Next.js from automatically prefetching linked pages.
 */

async function countScheduleCallsOnPageLoad(
  page: Page,
  url: string
): Promise<{ trpcCalls: string[]; apiV2Calls: string[] }> {
  const trpcCalls: string[] = [];
  const apiV2Calls: string[] = [];

  // Intercept getSchedule API calls
  await page.route("**/api/trpc/slots/getSchedule**", async (route) => {
    trpcCalls.push(route.request().url());
    await route.continue();
  });

  await page.route("**/api/v2/slots/available**", async (route) => {
    apiV2Calls.push(route.request().url());
    await route.continue();
  });

  // Navigate to the page
  await page.goto(url);

  // Wait for the page to fully load and any potential prefetch requests to complete
  await page.waitForLoadState("networkidle");

  // Additional wait to ensure any delayed prefetch requests are captured
  await page.waitForTimeout(3000);

  return { trpcCalls, apiV2Calls };
}

test.describe("Team Page No Prefetch", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test("should not call getSchedule endpoints when loading team page", async ({ page, users }) => {
    // Create a team with multiple event types to simulate a real scenario
    const teamOwner = await users.create(
      { name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }, { name: "teammate-2" }],
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );

    const { team } = await teamOwner.getFirstTeamMembership();

    // Navigate to the team page (not the event type page)
    // This should NOT trigger any getSchedule calls because prefetch={false}
    const { trpcCalls, apiV2Calls } = await countScheduleCallsOnPageLoad(page, `/team/${team.slug}`);

    // Assert that NO schedule API calls were made on page load
    // If prefetch={false} is working correctly, the team page should not
    // prefetch any event type pages, which would trigger getSchedule calls
    expect(trpcCalls.length).toBe(0);
    expect(apiV2Calls.length).toBe(0);
  });

  test("should not call getSchedule endpoints when loading team page with many event types", async ({
    page,
    users,
  }) => {
    // Create a team with more teammates to have more event types
    const teamOwner = await users.create(
      { name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [
          { name: "teammate-1" },
          { name: "teammate-2" },
          { name: "teammate-3" },
          { name: "teammate-4" },
        ],
        schedulingType: SchedulingType.ROUND_ROBIN,
      }
    );

    const { team } = await teamOwner.getFirstTeamMembership();

    // Navigate to the team page
    const { trpcCalls, apiV2Calls } = await countScheduleCallsOnPageLoad(page, `/team/${team.slug}`);

    // Assert that NO schedule API calls were made
    expect(trpcCalls.length).toBe(0);
    expect(apiV2Calls.length).toBe(0);
  });
});
