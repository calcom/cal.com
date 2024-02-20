import { expect, type Page } from "@playwright/test";

export function createAppsFixture(page: Page) {
  return {
    goToAppsCategory: async (category: string) => {
      await page.getByTestId(`app-store-category-${category}`).nth(1).click();
      await page.goto("apps/categories/analytics");
    },
    installApp: async (app: string) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();
    },
    goBackToAppsPage: async () => {
      await page.getByTestId("add-apps").click();
    },
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
    },
    goToAppsTab: async () => {
      await page.getByTestId("vertical-tab-apps").click();
    },
    activeApp: async (app: string) => {
      await page.getByTestId(`${app}-app-switch`).click();
    },
    verifyAppsInfo: async (activeApps: number) => {
      await expect(page.locator(`text=6 apps, ${activeApps} active`)).toBeVisible();
    },
  };
}
