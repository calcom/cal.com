import { expect, type Page } from "@playwright/test";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { shouldRedirectToAppOnboarding } from "@calcom/lib/apps/shouldRedirectToAppOnboarding";

export function createAppsFixture(page: Page) {
  return {
    goToAppsCategory: async (category: string) => {
      await page.getByTestId(`app-store-category-${category}`).nth(1).click();
      await page.goto("apps/categories/analytics");
    },
    installApp: async (app: string) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();

      const appMetadata = appStoreMetadata[app as keyof typeof appStoreMetadata];
      if (shouldRedirectToAppOnboarding(appMetadata)) {
        await page.click('[data-testid="install-app-button-personal"]');
        await page.waitForURL(`apps/installation/event-types?slug=${app}`);
        await page.click('[data-testid="set-up-later"]');
      }
    },

    installUsingNewAppInstallFlow: async (app: string, eventTypeIds: number[]) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();

      const appMetadata = appStoreMetadata[app as keyof typeof appStoreMetadata];
      if (shouldRedirectToAppOnboarding(appMetadata)) {
        await page.click('[data-testid="install-app-button-personal"]');
        await page.waitForURL(`apps/installation/event-types?slug=${app}`);

        for (const id of eventTypeIds) {
          await page.click(`[data-testid="select-event-type-${id}"]`);
        }

        await page.click(`[data-testid="save-event-types"]`);
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
      await page.getByTestId(`${app}-app-switch`).click();
    },
    verifyAppsInfo: async (activeApps: number) => {
      await expect(page.locator(`text=6 apps, ${activeApps} active`)).toBeVisible();
    },
    verifyAppsInfoNew: async (app: string, eventTypeId: number, activeApps: number) => {
      await page.goto(`event-types/${eventTypeId}?tabName=apps`);
      await page.getByTestId(`${app}-app-switch`).isChecked();
    },
  };
}
