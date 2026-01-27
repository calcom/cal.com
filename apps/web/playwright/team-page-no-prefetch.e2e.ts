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

async function countPrefetchRequestsOnPageLoad(
  page: Page,
  url: string,
  teamSlug: string
): Promise<{ rscPrefetchCalls: string[] }> {
  const rscPrefetchCalls: string[] = [];

  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    // Check if this is an RSC prefetch request for an event type page
    if (requestUrl.includes("_rsc=") && !requestUrl.includes("/api/")) {
      const urlPath = new URL(requestUrl).pathname;
      if (urlPath.startsWith(`/team/${teamSlug}/`) || urlPath.match(/^\/[^/]+$/)) {
        rscPrefetchCalls.push(requestUrl);
      }
    }
    await route.continue();
  });

  await page.goto(url);
  await page.waitForLoadState("networkidle");

  // Wait for page to fully load and any prefetch requests to complete
  await page.waitForTimeout(3000);

  return { rscPrefetchCalls };
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

    const { rscPrefetchCalls } = await countPrefetchRequestsOnPageLoad(
      page,
      `/team/${team.slug}`,
      team.slug
    );

    // With prefetch={false}, no RSC prefetch requests should be made on page load
    expect(rscPrefetchCalls.length).toBe(0);
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

    const { rscPrefetchCalls } = await countPrefetchRequestsOnPageLoad(
      page,
      `/team/${team.slug}`,
      team.slug
    );

    expect(rscPrefetchCalls.length).toBe(0);
  });
});
