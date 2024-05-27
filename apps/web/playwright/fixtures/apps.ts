import { expect, type Page } from "@playwright/test";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { shouldRedirectToAppOnboarding } from "@calcom/lib/apps/shouldRedirectToAppOnboarding";

export function createAppsFixture(page: Page) {
  return {
    goToAppsCategory: async (category: string) => {
      await page.getByTestId(`app-store-category-${category}`).nth(1).click();
      await page.goto("apps/categories/analytics");
    },
    installAppSkipConfigure: async (app: string) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();
      const appMetadata = appStoreMetadata[app as keyof typeof appStoreMetadata];
      if (shouldRedirectToAppOnboarding(appMetadata)) {
        await page.click('[data-testid="install-app-button-personal"]');
        await page.waitForURL(`apps/installation/event-types?slug=${app}`);
        await page.click('[data-testid="set-up-later"]');
      }
    },
    installApp: async (app: string, eventTypeIds: number[]) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      (await page.waitForSelector('[data-testid="install-app-button"]')).click();

      const appMetadata = appStoreMetadata[app as keyof typeof appStoreMetadata];
      if (shouldRedirectToAppOnboarding(appMetadata)) {
        await page.click('[data-testid="install-app-button-personal"]');
        await page.waitForURL(`apps/installation/event-types?slug=${app}`);

        for (const id of eventTypeIds) {
          await page.click(`[data-testid="select-event-type-${id}"]`);
        }

        await page.click(`[data-testid="save-event-types"]`);

        // adding random-tracking-id to gtm-tracking-id-input because this field is required and the test fails without it
        if (app === "gtm") {
          await page.waitForLoadState("domcontentloaded");
          for (let index = 0; index < eventTypeIds.length; index++) {
            await page.getByTestId("gtm-tracking-id-input").nth(index).fill("random-tracking-id");
          }
        }
        await page.click(`[data-testid="configure-step-save"]`);
      }
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
      await page.locator(`[data-testid='${app}-app-switch']`).click();
    },
    verifyAppsInfo: async (activeApps: number) => {
      await expect(page.locator(`text=6 apps, ${activeApps} active`)).toBeVisible();
    },
    verifyAppsInfoNew: async (apps: string[], eventTypeId: number) => {
      await page.goto(`event-types/${eventTypeId}?tabName=apps`);
      await page.waitForLoadState("domcontentloaded");
      for (const app of apps) {
        await expect(page.locator(`[data-testid='${app}-app-switch'][data-state="checked"]`)).toBeVisible();
      }
    },
  };
}
