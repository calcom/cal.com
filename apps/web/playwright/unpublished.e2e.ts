import { SchedulingType } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

// Keep parallel mode - each test creates its own isolated data
test.describe.configure({ mode: "parallel" });

const title = (name: string) => `${name} is unpublished`;
const description = (entity: string) =>
  `This ${entity} link is currently not available. Please contact the ${entity} owner or ask them to publish it.`;

const assertChecks = async (page: any, entityName: string, entityType: string) => {
  await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
  await expect(page.locator(`h2:has-text("${title(entityName)}")`)).toHaveCount(1);
  await expect(page.locator(`div:text("${description(entityType)}")`)).toHaveCount(1);
  await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
};

// Group 1: Regular team tests - share setup data
test.describe("Unpublished - Regular team", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Regular team profile", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getFirstTeamMembership();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    const teamEventSlug = (await owner.getFirstTeamEvent(team.id)).slug;
    const prefixes = ["", "/en"];

    // Test team profile
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/team/${requestedSlug}`);
      await assertChecks(page, team.name, "team");
    }

    // Test team event type (reuse same data)
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/team/${requestedSlug}/${teamEventSlug}`);
      await assertChecks(page, team.name, "team");
    }
  });
});

// Group 2: Organization tests - share setup data
test.describe("Unpublished - Organization", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Organization profile and user", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const [{ slug: ownerEventType }] = owner.eventTypes;
    const prefixes = ["", "/en"];

    // Test organization profile
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}`);
      await assertChecks(page, org.name, "organization");
    }

    // Test organization user
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/${owner.username}`);
      await assertChecks(page, org.name, "organization");
    }

    // Test organization user event-type
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/${owner.username}/${ownerEventType}`);
      await assertChecks(page, org.name, "organization");
    }
  });
});

// Group 3: Organization sub-team tests - share setup data
test.describe("Unpublished - Organization sub-team", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Organization sub-team and event-type", async ({ users, page }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const [{ slug: subteamSlug, id: subteamId }] = org.children as { slug: string; id: number }[];
    const { slug: subteamEventSlug } = await owner.getFirstTeamEvent(subteamId);
    const prefixes = ["", "/en"];

    // Test organization sub-team
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/team/${subteamSlug}`);
      await assertChecks(page, org.name, "organization");
    }

    // Test organization sub-team event-type
    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/team/${subteamSlug}/${subteamEventSlug}`);
      await assertChecks(page, org.name, "organization");
    }
  });
});
