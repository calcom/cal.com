import { expect } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const title = (name: string) => `${name} is unpublished`;
const description = (entity: string) =>
  `This ${entity} link is currently not available. Please contact the ${entity} owner or ask them to publish it.`;
const avatar = (slug: string) => `http://localhost:3000/team/${slug}/avatar.png`;

test.afterAll(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Unpublished", () => {
  test("Regular team profile", async ({ page, users }) => {
    const owner = await users.create(undefined, { hasTeam: true, isUnpublished: true });
    const { team } = await owner.getTeam();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    await page.goto(`/team/${requestedSlug}/`);
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(team.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("team")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug!));
  });

  test("Regular team event type", async ({ page, users }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getTeam();
    const { requestedSlug } = team.metadata as { requestedSlug: string };
    const { slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);
    await page.goto(`/team/${requestedSlug}/${teamEventSlug}`);
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title(team.name)}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("team")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar(requestedSlug!));
  });

  test("Organization profile", async ({ page }) => {
    await page.goto("/org/acme");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Acme")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("acme"));
  });

  test("Organization sub-team", async ({ page }) => {
    await page.goto("/org/acme/team/marketing");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Acme")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("acme"));
  });

  test("Organization sub-team event-type", async ({ page }) => {
    await page.goto("/org/acme/team/marketing/collective");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Acme")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("acme"));
  });

  test("Organization user", async ({ page }) => {
    await page.goto("/org/acme/john");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Acme")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("acme"));
  });

  test("Organization user event-type", async ({ page }) => {
    await page.goto("/org/acme/john/30min");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Acme")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("organization")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("acme"));
  });
});
