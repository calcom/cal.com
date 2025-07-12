import { expect } from "@playwright/test";

import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Collective Event Types", () => {
  test("Can create collective event type", async ({ page, users }) => {
    // Creating the owner user of the team
    const adminUser = await users.create(
      { name: "Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
      }
    );

    // Creating the member user of the team
    // First we work with owner user, logging in
    await adminUser.apiLogin();
    // Let's create a team
    // Going to create an event type
    await page.goto("/event-types");
    const tabItem = page.getByTestId(`horizontal-tab-Owner`);
    await expect(tabItem).toBeVisible();
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.getByTestId("new-event-type").click();
    await page.getByTestId("option-team-1").click();
    // Expecting we can add a managed event type as team owner
    const locator = page.locator('div:has(input[value="COLLECTIVE"]) > button');

    await expect(locator).toBeVisible();
    // Actually creating a managed event type to test things further
    await locator.click();
    await page.fill("[name=title]", "collective");
    await page.click("[type=submit]");

    await page.waitForURL("event-types/**");
    expect(page.url()).toContain("?tabName=team");
  });

  test("first added team member gets organizer label", async ({ page, users }) => {
    // Create admin user with team + 3 teammates (4 total members)
    const adminUser = await users.create(
      {
        // Admin user options
        email: "team-admin@example.com",
        username: "team-admin",
        name: "Team Admin",
      },
      {
        hasTeam: true,
        teamRole: "OWNER",
        teammates: [
          {
            email: "teammate-1@example.com",
            username: "team-member-1",
            name: "Team Member 1",
          },
          {
            email: "teammate-2@example.com",
            username: "team-member-2",
            name: "Team Member 2",
          },
          {
            email: "teammate-3@example.com",
            username: "team-member-3",
            name: "Team Member 3",
          },
        ],
        schedulingType: "COLLECTIVE",
        teamEventTitle: "Team Meeting",
        teamEventSlug: "team-meeting",
        teamEventLength: 60,
      }
    );

    // Get team info
    const { team } = await adminUser.getFirstTeamMembership();
    const teamEvent = await adminUser.getFirstTeamEvent(team.id, "COLLECTIVE");

    // delete all hosts for the team event (we'll add them back later)
    await prisma.host.deleteMany({
      where: {
        eventTypeId: teamEvent.id,
      },
    });

    await adminUser.apiLogin();
    await page.goto(`/event-types/${teamEvent.id}?tabName=team`);

    // adding hosts to the team event
    await page.locator("span").filter({ hasText: "Select..." }).click();
    await page.getByText("Team Member 3").click();
    await page.locator("span").filter({ hasText: "Select..." }).click();
    await page.getByText("Team Member 1").click();
    await page.locator("span").filter({ hasText: "Select..." }).click();
    await page.getByText("Team Member 2").click();
    await page.getByText("Save").click();

    // wait for 3 seconds to make sure the hosts are added
    await page.waitForTimeout(3000);

    // check if the hosts are added
    const hosts = await prisma.host.findMany({
      where: {
        eventTypeId: teamEvent.id,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    expect(hosts).toHaveLength(3); // all hosts are added
    expect(hosts.filter((host) => host.isFixed)).toHaveLength(3); // all hosts are fixed

    // check if first added host is organizer
    const organizerHost = hosts.find((host) => host.isOrganizer);
    expect(organizerHost).toBeDefined();
    expect(organizerHost?.user.name).toBe("Team Member 3");
  });
});
