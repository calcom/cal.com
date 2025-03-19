import { expect, type Page } from "@playwright/test";

import { gotoWhenIdle, localize } from "../lib/testUtils";

export function createEventTypeFixture(page: Page) {
  return {
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
    },
    goToTab: async (tabName: string) => {
      await page.getByTestId(`vertical-tab-${tabName}`).click();
    },
    goToEventTypesPage: async () => {
      await gotoWhenIdle(page, "/event-types");
    },
    checkAvailabilityTab: async () => {
      const editAvailability = (await localize("en"))("edit_availability");

      // Verify if the icon is rendered
      await expect(page.locator("span").filter({ hasText: "Europe/London" }).locator("svg")).toBeVisible();
      await expect(page.getByText("Europe/London")).toBeVisible();
      await page.getByRole("link", { name: editAvailability }).click();
    },
    goToAvailabilityPage: async () => {
      const workingHours = (await localize("en"))("default_schedule_name");

      await gotoWhenIdle(page, "/availability");
      await page
        .getByTestId("schedules")
        .locator("div")
        .filter({
          hasText: workingHours,
        })
        .first()
        .click();
    },
  };
}
