import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { createTeamEventType } from "./fixtures/users";
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

test.describe("Duplicate API Calls Prevention", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test("should detect when schedule endpoints are called multiple times for individual user events - beginning of month", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "30-min");
    const beginningOfMonth = new Date();
    beginningOfMonth.setDate(5);

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
    const endOfMonth = new Date();
    endOfMonth.setDate(20);

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

  test("should detect when schedule endpoints are called multiple times for team events - beginning of month", async ({
    page,
    users,
  }) => {
    const teamOwner = await users.create(
      { name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
      }
    );
    const beginningOfMonth = new Date();
    beginningOfMonth.setDate(5);

    const { team } = await teamOwner.getFirstTeamMembership();
    const teamEvent = await createTeamEventType(
      { id: teamOwner.id },
      { id: team.id },
      { teamEventSlug: "team-event-test", teamEventTitle: "Team Event Test" }
    );

    const { totalCalls, trpcCalls, apiV2Calls } = await testDuplicateAPICalls(
      page,
      `/team/${team.slug}/${teamEvent.slug}`,
      beginningOfMonth
    );

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls).toBeLessThanOrEqual(1);
    expect(apiV2Calls).toBeLessThanOrEqual(1);
  });

  test("should detect when schedule endpoints are called multiple times for team events - end of month", async ({
    page,
    users,
  }) => {
    const teamOwner = await users.create(
      { name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
      }
    );

    const { team } = await teamOwner.getFirstTeamMembership();
    const teamEvent = await createTeamEventType(
      { id: teamOwner.id },
      { id: team.id },
      { teamEventSlug: "team-event-test", teamEventTitle: "Team Event Test" }
    );
    const endOfMonth = new Date();
    endOfMonth.setDate(20);

    const { totalCalls, trpcCalls, apiV2Calls } = await testDuplicateAPICalls(
      page,
      `/team/${team.slug}/${teamEvent.slug}`,
      endOfMonth
    );

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls).toBeLessThanOrEqual(1);
    expect(apiV2Calls).toBeLessThanOrEqual(1);
  });

  test("should detect when schedule endpoints are called multiple times for organization team events - beginning of month", async ({
    page,
    users,
  }) => {
    const orgOwner = await users.create(
      { name: "Org Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
        isOrg: true,
        isOrgVerified: true,
        hasSubteam: true,
      }
    );

    const { team } = await orgOwner.getFirstTeamMembership();
    const { team: org } = await orgOwner.getOrgMembership();
    const teamEvent = await createTeamEventType(
      { id: orgOwner.id },
      { id: team.id },
      { teamEventSlug: "org-team-event", teamEventTitle: "Org Team Event" }
    );
    const beginningOfMonth = new Date();
    beginningOfMonth.setDate(5);

    const { totalCalls, trpcCalls, apiV2Calls } = await testDuplicateAPICalls(
      page,
      `/org/${org.slug}/${team.slug}/${teamEvent.slug}`,
      beginningOfMonth
    );

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls).toBeLessThanOrEqual(1);
    expect(apiV2Calls).toBeLessThanOrEqual(1);
  });

  test("should detect when schedule endpoints are called multiple times for organization team events - end of month", async ({
    page,
    users,
  }) => {
    const orgOwner = await users.create(
      { name: "Org Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
        isOrg: true,
        isOrgVerified: true,
        hasSubteam: true,
      }
    );

    const { team } = await orgOwner.getFirstTeamMembership();
    const { team: org } = await orgOwner.getOrgMembership();
    const teamEvent = await createTeamEventType(
      { id: orgOwner.id },
      { id: team.id },
      { teamEventSlug: "org-team-event", teamEventTitle: "Org Team Event" }
    );
    const endOfMonth = new Date();
    endOfMonth.setDate(20);

    const { totalCalls, trpcCalls, apiV2Calls } = await testDuplicateAPICalls(
      page,
      `/org/${org.slug}/${team.slug}/${teamEvent.slug}`,
      endOfMonth
    );

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls).toBeLessThanOrEqual(1);
    expect(apiV2Calls).toBeLessThanOrEqual(1);
  });
});
