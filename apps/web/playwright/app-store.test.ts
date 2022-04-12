import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("App Store - Authed", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await page.goto("/apps");
    await page.click('[data-testid="app-store-category-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.endsWith("apps/categories/calendar");
      },
    });
    await page.click('[data-testid="app-store-app-card-apple-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.endsWith("apps/apple-calendar");
      },
    });
    await page.click('[data-testid="install-app-button"]');
  });
});

test.describe.only("App Store - Unauthed", () => {
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await page.goto("/apps");
    await page.click('[data-testid="app-store-category-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.endsWith("apps/categories/calendar");
      },
    });
    await page.click('[data-testid="app-store-app-card-apple-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.endsWith("apps/apple-calendar");
      },
    });
    await page.click('[data-testid="install-app-button"]');
  });
});
