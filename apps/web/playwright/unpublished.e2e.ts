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

test.describe("Unpublished", () => {
  test("Regular team profile", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true });
    const { team } = await owner.getFirstTeamMembership();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    await page.goto(`/team/${requestedSlug}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(team.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("team")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
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
    await page.goto(`/team/${requestedSlug}/${teamEventSlug}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(team.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("team")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
  });

  test("Organization profile", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    await page.goto(`/org/${requestedSlug}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(org.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("organization")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
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
    await page.goto(`/org/${requestedSlug}/team/${subteamSlug}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(org.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("organization")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
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
    await page.goto(`/org/${requestedSlug}/team/${subteamSlug}/${subteamEventSlug}`);

    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(org.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("organization")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
  });

  test("Organization user", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    await page.goto(`/org/${requestedSlug}/${owner.username}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(org.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("organization")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
  });

  test("Organization user event-type", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const [{ slug: ownerEventType }] = owner.eventTypes;
    await page.goto(`/org/${requestedSlug}/${owner.username}/${ownerEventType}`);
    await expect(page.locator('[data-testid="empty-screen"]')).toHaveCount(1);
    await expect(page.locator(`h2:has-text("${title(org.name)}")`)).toHaveCount(1);
    await expect(page.locator(`div:text("${description("organization")}")`)).toHaveCount(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", /.*/);
  });
});
