import { expect, type Page } from "@playwright/test";

import type { TApp } from "../apps/conferencing/conferencingApps.e2e";
import {
  gotoBookingPage,
  gotoFirstEventType,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  saveEventType,
} from "../lib/testUtils";

export function createAppsFixture(page: Page) {
  return {
    goToAppsCategory: async (category: string) => {
      await page.getByTestId(`app-store-category-${category}`).nth(1).click();
      await page.goto("apps/categories/analytics");
    },
    installAnalyticsAppSkipConfigure: async (app: string) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();
      await page.click('[data-testid="install-app-button-personal"]');
      await page.waitForURL(`apps/installation/event-types?slug=${app}`);
      await page.click('[data-testid="set-up-later"]');
    },
    installAnalyticsApp: async (app: string, eventTypeIds: number[]) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      (await page.waitForSelector('[data-testid="install-app-button"]')).click();

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
    },

    installConferencingAppSkipConfigure: async (app: string) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      await page.getByTestId("install-app-button").click();
      await page.waitForURL(`apps/installation/event-types?slug=${app}`);
      await page.click('[data-testid="set-up-later"]');
    },
    verifyConferencingtApp: async (app: TApp, index: number) => {
      await page.goto("/event-types");
      await gotoFirstEventType(page);
      if (index == 0) {
        await page.getByTestId("location-select").last().click();
      } else {
        await page.locator("[data-testid=add-location]").click();
      }
      await page.getByTestId(`location-select-item-${app.type}`).click();
      if (app.organizerInputPlaceholder) {
        await page.getByTestId(`${app.type}-location-input`).fill(app.organizerInputPlaceholder);
      }
      await page.locator("[data-testid=display-location]").last().check();
      await saveEventType(page);
      await page.waitForLoadState("networkidle");
      await gotoBookingPage(page);
      await selectFirstAvailableTimeSlotNextMonth(page);

      if (index > 0) {
        if (app.organizerInputPlaceholder) {
          await page.getByLabel(app.organizerInputPlaceholder).click();
        } else {
          await page.getByLabel(app.label).click();
        }
      }
      await bookTimeSlot(page);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
      await expect(page.locator("[data-testid=where] ")).toContainText(app.label);
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
