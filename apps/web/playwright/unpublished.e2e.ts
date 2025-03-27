import { expect } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const title = (name: string) => `${name} is unpublished`;
const description = (entity: string) =>
  `This ${entity} link is currently not available. Please contact the ${entity} owner or ask them to publish it.`;

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

const assertChecks = async (page: any, entityName: string, entityType: string) => {
  await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
  await expect(page.locator(`h2:has-text("${title(entityName)}")`)).toHaveCount(1);
  await expect(page.locator(`div:text("${description(entityType)}")`)).toHaveCount(1);
  await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
};

test.describe("Unpublished", () => {
  test("Regular team profile", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true });
    const { team } = await owner.getFirstTeamMembership();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    const prefixes = ["", "/en"];

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/team/${requestedSlug}`);
      await assertChecks(page, team.name, "team");
    }
  });

  test("Regular team event type", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getFirstTeamMembership();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    const { slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);
    const prefixes = ["", "/en"];

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/team/${requestedSlug}/${teamEventSlug}`);
      await assertChecks(page, team.name, "team");
    }
  });

  test("Organization profile", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const prefixes = ["", "/en"];

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}`);
      await assertChecks(page, org.name, "organization");
    }
  });

  test("Organization sub-team", async ({ users, page }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const [{ slug: subteamSlug }] = org.children as { slug: string }[];
    const prefixes = ["", "/en"];

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/team/${subteamSlug}`);
      await assertChecks(page, org.name, "organization");
    }
  });

  test("Organization sub-team event-type", async ({ users, page }) => {
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

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/team/${subteamSlug}/${subteamEventSlug}`);
      await assertChecks(page, org.name, "organization");
    }
  });

  test("Organization user", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const prefixes = ["", "/en"];

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/${owner.username}`);
      await assertChecks(page, org.name, "organization");
    }
  });

  test("Organization user event-type", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const [{ slug: ownerEventType }] = owner.eventTypes;
    const prefixes = ["", "/en"];

    for (const prefix of prefixes) {
      await page.goto(`${prefix}/org/${requestedSlug}/${owner.username}/${ownerEventType}`);
      await assertChecks(page, org.name, "organization");
    }
  });
});
