import { test } from "./lib/fixtures";

test.describe("App Store - Authed", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await page.goto("/apps");
    page.click('[data-testid="app-store-category-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        console.log(url, url.pathname);
        return url.pathname.includes("apps/categories/calendar");
      },
    });
    page.click('[data-testid="app-store-app-card-apple-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.includes("apps/apple-calendar");
      },
    });
    await page.click('[data-testid="install-app-button"]');
  });
});

test.describe("App Store - Unauthed", () => {
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await page.goto("/apps");

    await page.click('[data-testid="app-store-category-calendar"]');
    if (!page.url().includes("apps/categories/calendar")) {
      await page.waitForNavigation({
        url: (url) => {
          console.log(url, url.pathname);
          return url.pathname.includes("apps/categories/calendar");
        },
      });
    }
    await page.click('[data-testid="app-store-app-card-apple-calendar"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.includes("apps/apple-calendar");
      },
    });
    await page.click('[data-testid="install-app-button"]');
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.includes("/auth/login");
      },
    });
  });
});
