import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

/**
 * Tests that the team page does not prefetch event type pages on hover.
 * In dev mode, Next.js prefetches on hover (not viewport entry).
 * When prefetch={false} is NOT set, hovering over links triggers RSC requests
 * with `_rsc` query parameter, which causes server-side rendering and API calls
 * (like Google Calendar), causing rate limits for teams with many event types.
 */

async function countPrefetchRequestsOnHover(
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

  // Wait for team name to be visible (ensures page is loaded)
  await expect(page.locator('[data-testid="team-name"]')).toBeVisible({ timeout: 10000 });

  // Hover over event type links to trigger prefetch (in dev mode, prefetch happens on hover)
  const eventTypeLinks = page.locator('[data-testid="event-type-link"]');
  const linkCount = await eventTypeLinks.count();

  // If there are event type links, hover over them
  for (let i = 0; i < linkCount; i++) {
    await eventTypeLinks.nth(i).hover();
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(1000);

  return { rscPrefetchCalls };
}

test.describe("Team Page No Prefetch", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test("should not prefetch event type pages when hovering over links", async ({ page, users }) => {
    const teamOwner = await users.create(
      { name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }, { name: "teammate-2" }],
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );

    const { team } = await teamOwner.getFirstTeamMembership();

    const { rscPrefetchCalls } = await countPrefetchRequestsOnHover(
      page,
      `/team/${team.slug}`,
      team.slug
    );

    // With prefetch={false}, no RSC prefetch requests should be made when hovering
    expect(rscPrefetchCalls.length).toBe(0);
  });

  test("should not prefetch event type pages when hovering with many event types", async ({
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

    const { rscPrefetchCalls } = await countPrefetchRequestsOnHover(
      page,
      `/team/${team.slug}`,
      team.slug
    );

    expect(rscPrefetchCalls.length).toBe(0);
  });
});
