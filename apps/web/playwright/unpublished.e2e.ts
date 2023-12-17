import { expect } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const title = (name: string) => `${name} is unpublished`;
const description = (entity: string) =>
  `This ${entity} link is currently not available. Please contact the ${entity} owner or ask them to publish it.`;
const avatar = (slug: string, entity = "team") => `/${entity}/${slug}/avatar.png`;

test.afterAll(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Unpublished", () => {
  test("Regular team profile", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true });
    const { team } = await owner.getFirstTeam();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    await page.goto(`/team/${requestedSlug}`);
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(team.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("team")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug));
  });

  test("Regular team event type", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getFirstTeam();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    const { slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);
    await page.goto(`/team/${requestedSlug}/${teamEventSlug}`);
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(team.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("team")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug));
  });

  test("Organization profile", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    await page.goto(`/org/${requestedSlug}`);
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(org.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug, "org"));
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
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(org.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug, "org"));
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
    await page.waitForLoadState("networkidle");

    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(org.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug, "org"));
  });

  test("Organization user", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    await page.goto(`/org/${requestedSlug}/${owner.username}`);
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(org.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug, "org"));
  });

  test("Organization user event-type", async ({ users, page }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true, isOrg: true });
    const { team: org } = await owner.getOrgMembership();
    const { requestedSlug } = org.metadata as { requestedSlug: string };
    const [{ slug: ownerEventType }] = owner.eventTypes;
    await page.goto(`/org/${requestedSlug}/${owner.username}/${ownerEventType}`);
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(org.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug, "org"));
  });
});
