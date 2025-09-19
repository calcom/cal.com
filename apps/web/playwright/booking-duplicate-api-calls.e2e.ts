import { expect } from "@playwright/test";

import { createTeamEventType } from "./fixtures/users";
import { test } from "./lib/fixtures";

test.describe("Duplicate API Calls Prevention", () => {
  test.afterEach(({ users }) => users.deleteAll());

  test("should detect when schedule endpoints are called multiple times for individual user events", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "30-min");

    const trpcCalls: string[] = [];
    const apiV2Calls: string[] = [];

    // Intercept tRPC getSchedule calls - pattern matches /api/trpc/slots/getSchedule
    await page.route("**/api/trpc/slots/getSchedule**", async (route) => {
      trpcCalls.push(route.request().url());
      await route.continue();
    });

    await page.route("**/api/v2/slots/available**", async (route) => {
      apiV2Calls.push(route.request().url());
      await route.continue();
    });

    await page.goto(`/${user.username}/${eventType?.slug}`);

    await page.waitForTimeout(5000);

    const totalCalls = trpcCalls.length + apiV2Calls.length;

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls.length).toBeLessThanOrEqual(1);
    expect(apiV2Calls.length).toBeLessThanOrEqual(1);
  });

  test("should detect when schedule endpoints are called multiple times for team events", async ({
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

    const trpcCalls: string[] = [];
    const apiV2Calls: string[] = [];

    await page.route("**/api/trpc/slots/getSchedule**", async (route) => {
      trpcCalls.push(route.request().url());
      await route.continue();
    });

    await page.route("**/api/v2/slots/available**", async (route) => {
      apiV2Calls.push(route.request().url());
      await route.continue();
    });

    await page.goto(`/team/${team.slug}/${teamEvent.slug}`);

    await page.waitForTimeout(5000);

    const totalCalls = trpcCalls.length + apiV2Calls.length;

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls.length).toBeLessThanOrEqual(1);
    expect(apiV2Calls.length).toBeLessThanOrEqual(1);
  });

  test("should detect when schedule endpoints are called multiple times for organization team events", async ({
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

    const trpcCalls: string[] = [];
    const apiV2Calls: string[] = [];

    await page.route("**/api/trpc/slots/getSchedule**", async (route) => {
      trpcCalls.push(route.request().url());
      await route.continue();
    });

    await page.route("**/api/v2/slots/available**", async (route) => {
      apiV2Calls.push(route.request().url());
      await route.continue();
    });

    await page.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);

    await page.waitForTimeout(5000);

    const totalCalls = trpcCalls.length + apiV2Calls.length;

    expect(totalCalls).toBeGreaterThan(0);
    expect(totalCalls).toBeLessThanOrEqual(1);
    expect(trpcCalls.length).toBeLessThanOrEqual(1);
    expect(apiV2Calls.length).toBeLessThanOrEqual(1);
  });
});
