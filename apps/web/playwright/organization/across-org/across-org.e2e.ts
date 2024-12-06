import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { test } from "../../lib/fixtures";

test.afterEach(({ users }) => {
  users.deleteAll();
});

test.describe("user1NotMemberOfOrg1 is part of team1MemberOfOrg1", () => {
  test("Team1 profile should show correct domain if logged in as User1", async ({ page, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });

    const user1NotMemberOfOrg1 = await users.create(undefined, {
      hasTeam: true,
    });

    const { team: team1MemberOfOrg1 } = await user1NotMemberOfOrg1.getFirstTeamMembership();
    await moveTeamToOrg({ team: team1MemberOfOrg1, org });

    await user1NotMemberOfOrg1.apiLogin();

    await page.goto(`/settings/teams/${team1MemberOfOrg1.id}/profile`);
    const domain = await page.locator(".testid-leading-text-team-url").textContent();
    expect(domain).toContain(org.slug);
  });

  test("EventTypes listing should show correct link for user events and team1MemberOfOrg1's events", async ({
    page,
    users,
    orgs,
  }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });

    const user1NotMemberOfOrg1 = await users.create(undefined, {
      hasTeam: true,
    });

    const { team: team1MemberOfOrg1 } = await user1NotMemberOfOrg1.getFirstTeamMembership();
    await moveTeamToOrg({ team: team1MemberOfOrg1, org });

    await user1NotMemberOfOrg1.apiLogin();
    await page.goto("/event-types");

    await page.waitForSelector(`[data-testid="event-types"] [data-testid="preview-link-button"]`, {
      timeout: 5000,
    });
    const userEventLinksLocators = await page
      .locator(`[data-testid="event-types"] [data-testid="preview-link-button"]`)
      .all();

    // Get all the event links
    expect(userEventLinksLocators.length).toBeGreaterThan(0);
    for (const userEventLinkLocator of userEventLinksLocators) {
      const href = await userEventLinkLocator.getAttribute("href");
      expect(href).toContain(WEBAPP_URL);
    }

    await page.goto(`/event-types?teamId=${team1MemberOfOrg1.id}`);

    await page.waitForSelector(`[data-testid="event-types"] [data-testid="preview-link-button"]`, {
      timeout: 5000,
    });
    const teamEventLinksLocators = await page
      .locator(`[data-testid="event-types"] [data-testid="preview-link-button"]`)
      .all();

    expect(teamEventLinksLocators.length).toBeGreaterThan(0);

    for (const teamEventLinksLocator of teamEventLinksLocators) {
      const href = await teamEventLinksLocator.getAttribute("href");
      expect(href).not.toContain(WEBAPP_URL);
      expect(href).toContain(org.slug);
    }
  });
});

async function moveTeamToOrg({
  team,
  org,
}: {
  team: {
    id: number;
  };
  org: {
    id: number;
  };
}) {
  await prisma.team.update({
    where: {
      id: team.id,
    },
    data: {
      parent: {
        connect: {
          id: org.id,
        },
      },
    },
  });
}
