import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

/**
 * Tests that the team page does not prefetch event type pages on page load.
 * In production, Next.js prefetches links when they enter the viewport.
 * When prefetch={false} is NOT set, page load triggers RSC requests
 * with `_rsc` query parameter, which causes server-side rendering and API calls
 * (like Google Calendar), causing rate limits for teams with many event types.
 */

async function countEventTypePrefetchRequests(
  page: Page,
  url: string,
  teamSlug: string
): Promise<{ eventTypePrefetchCalls: string[] }> {
  const eventTypePrefetchCalls: string[] = [];

  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    // Check if this is an RSC prefetch request for a team event type page
    // Event type URLs follow pattern: /team/{teamSlug}/{eventTypeSlug}
    if (requestUrl.includes("_rsc=") && !requestUrl.includes("/api/")) {
      const urlPath = new URL(requestUrl).pathname;
      // Only match event type URLs: /team/{teamSlug}/{eventTypeSlug}
      // This regex ensures we have exactly: /team/slug/eventSlug (3 segments after splitting)
      const teamEventTypePattern = new RegExp(`^/team/${teamSlug}/[^/]+$`);
      if (teamEventTypePattern.test(urlPath)) {
        eventTypePrefetchCalls.push(requestUrl);
      }
    }
    await route.continue();
  });

  await page.goto(url);
  await page.waitForLoadState("networkidle");

  // Wait for page to fully load and any prefetch requests to complete
  await page.waitForTimeout(3000);

  return { eventTypePrefetchCalls };
}

test.describe("Team Page No Prefetch", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test("should not prefetch event type pages on page load", async ({ page, users }) => {
    const teamOwner = await users.create(
      { name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }, { name: "teammate-2" }],
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );

    const { team } = await teamOwner.getFirstTeamMembership();

    const { eventTypePrefetchCalls } = await countEventTypePrefetchRequests(
      page,
      `/team/${team.slug}`,
      team.slug
    );

    // With prefetch={false}, no RSC prefetch requests should be made for event type pages
    expect(eventTypePrefetchCalls.length).toBe(0);
  });

  test("should not prefetch event type pages on page load with many event types", async ({
    page,
    users,
  }) => {
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

    const { eventTypePrefetchCalls } = await countEventTypePrefetchRequests(
      page,
      `/team/${team.slug}`,
      team.slug
    );

    expect(eventTypePrefetchCalls.length).toBe(0);
  });
});
