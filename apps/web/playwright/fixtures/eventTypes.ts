import { expect, type Page } from "@playwright/test";

import { localize } from "../lib/testUtils";

export function createEventTypeFixture(page: Page) {
  return {
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
    },
    goToTab: async (tabName: string) => {
      await page.getByTestId(`vertical-tab-${tabName}`).click();
    },
    goToEventTypesPage: async () => {
      await page.goto("/event-types");
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

      await page.goto("/availability");
      await page
        .getByTestId("schedules")
        .locator("div")
        .filter({
          hasText: workingHours,
        })
        .first()
        .click();
    },
    checkAvailabilityPage: async () => {
      const sunday = (await localize("en"))("sunday");
      const monday = (await localize("en"))("monday");
      const wednesday = (await localize("en"))("wednesday");
      const saturday = (await localize("en"))("saturday");
      const save = (await localize("en"))("save");
      const copyTimesTo = (await localize("en"))("copy_times_to");

      await page.getByTestId("availablity-title").click();
      // change availability name
      await page.getByTestId("availablity-title").fill("Working Hours test");
      await expect(page.getByTestId("subtitle")).toBeVisible();
      await page.getByTestId(sunday).getByRole("switch").click();
      await page.getByTestId(monday).first().click();
      await page.getByTestId(wednesday).getByRole("switch").click();
      await page.getByTestId(saturday).getByRole("switch").click();
      await page
        .locator("div")
        .filter({ hasText: "Sunday9:00am - 5:00pm" })
        .getByTestId("add-time-availability")
        .first()
        .click();
      await expect(page.locator("div").filter({ hasText: "6:00pm" }).nth(1)).toBeVisible();
      await page.getByRole("button", { name: save }).click();
      await expect(page.getByText("Sun - Tue, Thu - Sat, 9:00 AM - 5:00 PM")).toBeVisible();
      await expect(page.getByText("Sun, 5:00 PM - 6:00 PM")).toBeVisible();
      await page
        .locator("div")
        .filter({ hasText: "Sunday9:00am - 5:00pm" })
        .getByTestId("copy-button")
        .first()
        .click();
      await expect(page.getByText(copyTimesTo)).toBeVisible();
      await page.getByRole("checkbox", { name: monday }).check();
      await page.getByRole("button", { name: "Apply" }).click();
      await page.getByRole("button", { name: save }).click();
      await page
        .locator("#availability-form div")
        .filter({ hasText: "TimezoneEurope/London" })
        .locator("svg")
        .click();
      await page.locator("#react-select-3-input").fill("bras");
      await page.getByTestId("select-option-America/Sao_Paulo").click();
      await page.getByRole("button", { name: save }).click();
      await expect(page.getByTestId("toast-success").last()).toBeVisible();
      await page.getByTestId("add-override").click();
      await page.getByTestId("incrementMonth").click();
      await page.getByRole("button", { name: "20" }).click();
      await page.getByTestId("date-override-mark-unavailable").click();
      await page.getByTestId("add-override-submit-btn").click();
      await page.getByTestId("dialog-rejection").click();
      await page.getByTestId("date-overrides-list").getByRole("button").nth(1).click();
      await page.getByRole("button", { name: save }).click();
      await expect(page.getByTestId("toast-success").last()).toBeVisible();
    },
  };
}
