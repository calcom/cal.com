import { expect, type Page } from "@playwright/test";

import type { TApp } from "../apps/conferencing/types";
import {
  bookTimeSlot,
  gotoBookingPage,
  gotoFirstEventType,
  saveEventType,
  selectFirstAvailableTimeSlotNextMonth,
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
      await page.waitForURL(`apps/installation/accounts?slug=${app}`);
      await page.reload();
      await page.click('[data-testid="install-app-button-personal"]');
      await page.waitForURL(`apps/installation/event-types?slug=${app}`);
      await page.click('[data-testid="set-up-later"]');
    },
    installAnalyticsApp: async (app: string, eventTypeIds: number[]) => {
      await page.getByTestId(`app-store-app-card-${app}`).click();
      (await page.waitForSelector('[data-testid="install-app-button"]')).click();
      await page.waitForURL(`apps/installation/accounts?slug=${app}`);
      await page.reload();

      await page.click('[data-testid="install-app-button-personal"]');
      await page.waitForURL(`apps/installation/event-types?slug=${app}`);

      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(1000);
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
      await page.waitForURL("/event-types");
    },

    installConferencingAppSkipConfigure: async (app: string) => {
      await page.goto(`apps/${app}`);
      await page.getByTestId("install-app-button").click();
      await page.waitForURL(`apps/installation/event-types?slug=${app}`);
      await page.click('[data-testid="set-up-later"]');
    },
    verifyConferencingApp: async (app: TApp) => {
      await page.goto("/event-types");
      await gotoFirstEventType(page);
      await page.getByTestId("location-select").last().click();
      await page.getByTestId(`location-select-item-${app.type}`).click();
      if (app.organizerInputPlaceholder) {
        await page.getByTestId(`${app.type}-location-input`).fill(app.organizerInputPlaceholder);
      }
      await page.locator("[data-testid=display-location]").last().check();
      await saveEventType(page);
      await gotoBookingPage(page);
      await selectFirstAvailableTimeSlotNextMonth(page);
      await bookTimeSlot(page);

      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
      await expect(page.locator("[data-testid=where] ")).toContainText(app.label);
    },

    installConferencingAppNewFlow: async (app: TApp, eventTypeIds: number[]) => {
      await page.goto(`apps/${app.slug}`);
      await page.getByTestId("install-app-button").click();
      await page.waitForURL(`apps/installation/event-types?slug=${app.slug}`);

      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(1000);
      for (const id of eventTypeIds) {
        await page.click(`[data-testid="select-event-type-${id}"]`);
      }
      await page.click(`[data-testid="save-event-types"]`);

      for (let eindex = 0; eindex < eventTypeIds.length; eindex++) {
        if (!app.organizerInputPlaceholder) continue;
        await page.getByTestId(`${app.type}-location-input`).nth(eindex).fill(app.organizerInputPlaceholder);
      }
      await page.click(`[data-testid="configure-step-save"]`);
      await page.waitForURL("/event-types");
    },

    verifyConferencingAppNew: async (app: TApp, eventTypeIds: number[]) => {
      for (const id of eventTypeIds) {
        await page.goto(`/event-types/${id}`);
        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page, { name: `Test Testson`, email: `test@example.com` });
        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("[data-testid=where] ")).toContainText(app.label);
      }
    },
    goBackToAppsPage: async () => {
      await page.getByTestId("add-apps").click();
    },
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
      // fix the race condition
      await page.waitForSelector('[data-testid="event-title"]');
      await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page");
    },
    goToAppsTab: async () => {
      await page.getByTestId("vertical-tab-apps").click();
      await expect(page.getByTestId("vertical-tab-apps")).toHaveAttribute("aria-current", "page");
    },
    activeApp: async (app: string) => {
      await page.locator(`[data-testid='${app}-app-switch']`).click();
    },
    verifyAppsInfo: async (activeApps: number) => {
      await expect(page.locator(`text=1 apps, ${activeApps} active`)).toBeVisible();
    },
    verifyAppsInfoNew: async (app: string, eventTypeId: number) => {
      await page.goto(`event-types/${eventTypeId}?tabName=apps`);
      await expect(page.getByTestId("vertical-tab-apps")).toHaveAttribute("aria-current", "page"); // fix the race condition
      await expect(page.locator(`[data-testid='${app}-app-switch'][data-state="checked"]`)).toBeVisible();
    },
  };
}
