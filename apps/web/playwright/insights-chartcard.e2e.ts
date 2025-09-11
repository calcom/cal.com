import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const createTeamsAndMembership = async (userIdOne: number, userIdTwo: number) => {
  const teamOne = await prisma.team.create({
    data: {
      name: "test-insights-chartcard",
      slug: `test-insights-chartcard-${Date.now()}-${randomString(5)}}`,
    },
  });

  const teamTwo = await prisma.team.create({
    data: {
      name: "test-insights-chartcard-2",
      slug: `test-insights-chartcard-2-${Date.now()}-${randomString(5)}}`,
    },
  });
  if (!userIdOne || !userIdTwo || !teamOne || !teamTwo) {
    throw new Error("Failed to create test data");
  }

  await prisma.membership.create({
    data: {
      userId: userIdOne,
      teamId: teamOne.id,
      accepted: true,
      role: "ADMIN",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamTwo.id,
      userId: userIdOne,
      accepted: true,
      role: "ADMIN",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamOne.id,
      userId: userIdTwo,
      accepted: true,
      role: "MEMBER",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamTwo.id,
      userId: userIdTwo,
      accepted: true,
      role: "MEMBER",
    },
  });
  return { teamOne, teamTwo };
};

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Insights ChartCard Components", async () => {
  test("should render all ChartCard components with expected titles", async ({ page, users }) => {
    const user = await users.create();
    const userTwo = await users.create();
    await createTeamsAndMembership(user.id, userTwo.id);

    await user.apiLogin();

    await page.goto("/insights");

    await page.locator('[data-testid^="insights-filters-false-"]').waitFor();

    const expectedChartTitles = [
      "Events",
      "Performance",
      "Event trends",
      "Bookings by hour",
      "Average event duration",
      "Recent no-show guests",
      "Most bookings scheduled",
      "Least bookings scheduled",
      "Most bookings completed",
      "Least bookings completed",
      "Most cancelled bookings",
      "Most no-show (host)",
      "Highest rated",
      "Lowest rated",
      "Recent ratings",
      "Popular events",
    ];

    for (const title of expectedChartTitles) {
      const chartCard = page.locator("h2.text-emphasis").filter({ hasText: title });
      await expect(chartCard).toBeVisible({ timeout: 15000 });
    }
  });

  test("should handle TRPC call failures gracefully", async ({ page, users }) => {
    const user = await users.create();
    const userTwo = await users.create();
    await createTeamsAndMembership(user.id, userTwo.id);

    await user.apiLogin();

    await page.route("**/api/trpc/**", (route) => {
      if (Math.random() > 0.5) {
        route.fulfill({ status: 500, body: "Server Error" });
      } else {
        route.continue();
      }
    });

    await page.goto("/insights");

    await page.locator('[data-testid^="insights-filters-false-"]').waitFor();

    const eventsCard = page.locator("h2.text-emphasis").filter({ hasText: "Events" });
    const performanceCard = page.locator("h2.text-emphasis").filter({ hasText: "Performance" });

    await expect(eventsCard).toBeVisible({ timeout: 15000 });
    await expect(performanceCard).toBeVisible({ timeout: 15000 });

    await expect(page.locator('[data-testid^="insights-filters-false-"]')).toBeVisible();
  });

  test("should render ChartCard components for organization users", async ({ users, page }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    await owner.apiLogin();

    await page.goto("/insights");
    await page.locator('[data-testid^="insights-filters-true-"]').waitFor();

    const keyChartTitles = ["Events", "Performance", "Event trends", "Bookings by hour"];

    for (const title of keyChartTitles) {
      const chartCard = page.locator("h2.text-emphasis").filter({ hasText: title });
      await expect(chartCard).toBeVisible({ timeout: 15000 });
    }
  });
});
