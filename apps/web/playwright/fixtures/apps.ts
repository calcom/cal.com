import type { Page } from "@playwright/test";

export function createAppsFixture(page: Page) {
  return {
    goToAppsPage: async () => {
      await page.goto("/apps");
    },
    goToAppsCategory: async (category: string) => {
      await page.getByTestId(`app-store-category-${category}`).nth(1).click();
      await page.goto("apps/categories/analytics");
    },
    goToApp: async (app: string) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();
    },
    goBackToAppsPage: async () => {
      await page.getByTestId("add-apps").click();
    },
    goToEventTypesPage: async () => {
      await page.getByTestId("event_types_page_title").click();
      await page.goto("/event-types");
    },
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
    },
    goToAppsTab: async () => {
      await page.getByTestId("vertical-tab-apps").click();
    },
    checkAndFillApp: async (app: string) => {
      await page.getByTestId(`${app}-app-switch`).click();
      if (app === "matomo") {
        await page.getByTestId(`${app}-input-url`).click();
        await page.getByTestId(`${app}-input-url`).fill("https://matomo.localhost");
        await page.getByTestId(`${app}-input-site-id`).click();
        await page.getByTestId(`${app}-input-site-id`).fill("1");
      }
      if (app === "plausible") {
        await page.getByTestId(`${app}-input-url`).click();
        await page.getByTestId(`${app}-input-url`).fill("https://plausible.localhost");
        await page.getByTestId(`${app}-input-tracking-id`).click();
        await page.getByTestId(`${app}-input-tracking-id`).fill("1");
      } else {
        await page.getByTestId(`${app}-input`).click();
        await page.getByTestId(`${app}-input`).fill(`https://${app}.localhost`);
      }
    },
    verifyAppsInfo: async (availableApps: number) => {
      await expect(page.getByTestId("active-apps")).toHaveText(
        `${availableApps} apps, ${availableApps.toString()} active`
      );
    },
  };
}
