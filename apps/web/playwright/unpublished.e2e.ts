import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const title = (name: string) => `${name} is unpublished`;
const description = (entity: string) =>
  `This ${entity} link is currently not available. Please contact the ${entity} owner or ask them to publish it.`;
const avatar = (slug: string) => `http://localhost:3000/team/${slug}/avatar.png`;

test.describe("Unpublished", () => {
  test("Regular team profile", async ({ page }) => {
    await page.goto("/team/foobar");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Foobar Team")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("team")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("foobar"));
  });

  test("Regular team event type", async ({ page }) => {
    await page.goto("/team/foobar/collective");
    await page.waitForLoadState("networkidle");
    expect(await page.locator('[data-testid="empty-screen"]').count()).toBe(1);
    expect(await page.locator(`h2:has-text("${title("Foobar Team")}")`).count()).toBe(1);
    expect(await page.locator(`div:text("${description("team")}")`).count()).toBe(1);
    await expect(page.locator(`img`)).toHaveAttribute("src", avatar("foobar"));
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
