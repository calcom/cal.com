import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("ISR Instant Loading", () => {
  let user: any;

  test.beforeEach(async ({ users }) => {
    user = await users.create();
    await user.apiLogin();
  });

  test("static route loads availability instantly without loading states", async ({ page }) => {
    const eventType = user.eventTypes[0];

    const staticUrl = `/${user.username}/${eventType.slug}/static`;
    await page.goto(staticUrl);

    await page.waitForLoadState("networkidle");

    const loadingIndicators = page.locator(
      '[data-testid*="loading"], [data-testid*="spinner"], .loading, .spinner'
    );
    await expect(loadingIndicators).toBeHidden();

    const availabilitySlots = page.locator('[data-testid="time"], [data-testid="slot"], .time-slot');
    await expect(availabilitySlots.first()).toBeVisible({ timeout: 1000 });

    await expect(page.locator('[data-testid="booking-form"], .booking-form')).toBeVisible();
  });

  test("regular SSR route vs static ISR route comparison", async ({ page }) => {
    const eventType = user.eventTypes[0];

    const ssrUrl = `/${user.username}/${eventType.slug}`;
    await page.goto(ssrUrl);
    await page.waitForLoadState("networkidle");

    const ssrContent = await page.textContent("main");

    const staticUrl = `/${user.username}/${eventType.slug}/static`;
    await page.goto(staticUrl);
    await page.waitForLoadState("networkidle");

    const loadingIndicators = page.locator(
      '[data-testid*="loading"], [data-testid*="spinner"], .loading, .spinner'
    );
    await expect(loadingIndicators).toBeHidden();

    const staticContent = await page.textContent("main");

    expect(staticContent).toBeTruthy();
    expect(ssrContent).toBeTruthy();

    await expect(page.locator('[data-testid="time"], [data-testid="slot"], .time-slot')).toBeVisible();
    await expect(page.locator('[data-testid="booking-form"], .booking-form')).toBeVisible();
  });

  test("static route has proper caching headers", async ({ page }) => {
    const eventType = user.eventTypes[0];

    const staticUrl = `/${user.username}/${eventType.slug}/static`;

    const response = await page.goto(staticUrl);

    expect(response?.status()).toBe(200);

    const headers = response?.headers();

    expect(headers?.["cache-control"]).toBeTruthy();

    await page.waitForLoadState("networkidle");
    const loadingIndicators = page.locator(
      '[data-testid*="loading"], [data-testid*="spinner"], .loading, .spinner'
    );
    await expect(loadingIndicators).toBeHidden();
  });
});
