import { expect, type Page } from "@playwright/test";

import type { MembershipRole } from "@calcom/prisma/enums";

import { localize } from "../lib/localize";
import { submitAndWaitForResponse } from "../lib/testUtils";
import type { createUsersFixture } from "./users";

export const scheduleSuccessfullyText = "This meeting is scheduled";

type UserFixture = ReturnType<typeof createUsersFixture>;

export async function loginUser(users: UserFixture) {
  const pro = await users.create({
    name: "testuser",
    eventTypes: [
      {
        title: "Test Event",
        slug: "test-event",
        length: 30,
      },
    ],
  });
  await pro.apiLogin();
}

export async function loginUserWithTeam(users: UserFixture, role: MembershipRole) {
  const pro = await users.create(
    { name: "testuser" },
    { hasTeam: true, teamRole: role, isOrg: true, hasSubteam: true }
  );
  await pro.apiLogin();
}

export function createBookingPageFixture(page: Page) {
  return {
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
    },
    goToPage: async (pageName: string, page: Page) => {
      await page.getByRole("link", { name: pageName }).click();
    },
    backToBookings: async (page: Page) => {
      await page.getByTestId("back-to-bookings").click();
    },
    goToTab: async (tabName: string) => {
      await page.getByTestId(`vertical-tab-${tabName}`).click();
    },
    goToEventTypesPage: async () => {
      await page.goto("/event-types");
    },
    updateEventType: async () => {
      await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
        action: () => page.locator("[data-testid=update-eventtype]").click(),
      });
    },
    previewEventType: async () => {
      const eventtypePromise = page.waitForEvent("popup");
      await page.getByTestId("preview-button").click();
      return eventtypePromise;
    },
    checkRequiresConfirmation: async () => {
      // Check existence of the icon
      await expect(page.getByTestId("requires-confirmation-title").locator("svg")).toBeVisible();

      const confirmationSwitch = page.getByTestId("requires-confirmation");
      await expect(confirmationSwitch).toBeVisible();
      await confirmationSwitch.click();
    },
    checkRequiresBookerEmailVerification: async () => {
      await expect(page.getByTestId("requires-booker-email-verification-title").locator("svg")).toBeVisible();

      const emailSwitch = page.getByTestId("requires-booker-email-verification");

      await expect(emailSwitch).toBeVisible();
      await emailSwitch.click();
    },
    checkHideNotes: async () => {
      await expect(page.getByTestId("disable-notes-title").locator("svg")).toBeVisible();

      const hideNotesSwitch = page.getByTestId("disable-notes");

      await expect(hideNotesSwitch).toBeVisible();
      await hideNotesSwitch.click();
    },
    checkRedirectOnBooking: async () => {
      await expect(page.getByTestId("redirect-success-booking-title").locator("svg")).toBeVisible();

      const redirectSwitch = page.getByTestId("redirect-success-booking");
      await expect(redirectSwitch).toBeVisible();
      await redirectSwitch.click();
      await expect(page.getByTestId("external-redirect-url")).toBeVisible();
      await page.getByTestId("external-redirect-url").fill("https://cal.com");
      await expect(page.getByTestId("redirect-url-warning")).toBeVisible();
    },
    checkEnablePrivateUrl: async () => {
      await expect(page.getByTestId("hashedLinkCheck-title").locator("label div")).toBeVisible();

      await expect(page.getByTestId("hashedLinkCheck-info")).toBeVisible();
      await expect(page.getByTestId("hashedLinkCheck")).toBeVisible();
      await page.getByTestId("hashedLinkCheck").click();
      await expect(page.getByTestId("generated-hash-url")).toBeVisible();
    },
    toggleOfferSeats: async () => {
      await expect(page.getByTestId("offer-seats-toggle-title").locator("svg")).toBeVisible();

      await page.getByTestId("offer-seats-toggle").click();

      const seatSwitchField = page.getByTestId("seats-per-time-slot");
      await seatSwitchField.fill("3");
      await expect(seatSwitchField).toHaveValue("3");
      await expect(page.getByTestId("show-attendees")).toBeVisible();
    },
    checkLockTimezone: async () => {
      await expect(page.getByTestId("lock-timezone-toggle-title").locator("svg")).toBeVisible();

      const lockSwitch = page.getByTestId("lock-timezone-toggle");

      await expect(lockSwitch).toBeVisible();
      await lockSwitch.click();
    },
    checkEventType: async () => {
      await expect(page.getByTestId("requires-confirmation-badge").last()).toBeVisible();
    },
    checkBufferTime: async () => {
      const minutes = (await localize("en"))("minutes");
      const fieldPlaceholder = page.getByPlaceholder("0");

      await page
        .locator("div")
        .filter({ hasText: /^No buffer time$/ })
        .nth(1)
        .click();
      await page.getByTestId("select-option-15").click();
      await expect(page.getByText(`15 ${minutes}`, { exact: true })).toBeVisible();

      await page
        .locator("div")
        .filter({ hasText: /^No buffer time$/ })
        .nth(2)
        .click();
      await page.getByTestId("select-option-10").click();
      await expect(page.getByText(`10 ${minutes}`, { exact: true })).toBeVisible();

      await fieldPlaceholder.fill("10");
      await expect(fieldPlaceholder).toHaveValue("10");

      await page
        .locator("div")
        .filter({ hasText: /^Use event length \(default\)$/ })
        .first()
        .click();

      // select a large interval to check if the time slots for a day reduce on the preview page
      await page.getByTestId("select-option-60").click();
      await expect(page.getByText(`60 ${minutes}`, { exact: true })).toBeVisible();
    },
    checkLimitBookingFrequency: async () => {
      const fieldPlaceholder = page.getByPlaceholder("1").nth(1);
      const limitFrequency = (await localize("en"))("limit_booking_frequency");
      const addlimit = (await localize("en"))("add_limit");
      const limitFrequencySwitch = page
        .locator("fieldset")
        .filter({ hasText: limitFrequency })
        .getByRole("switch");

      await limitFrequencySwitch.click();
      await page.getByRole("button", { name: addlimit }).click();
      await fieldPlaceholder.fill("12");
      await expect(fieldPlaceholder).toHaveValue("12");
      await limitFrequencySwitch.click();
    },
    checkLimitBookingDuration: async () => {
      const limitDuration = (await localize("en"))("limit_total_booking_duration");
      const addlimit = (await localize("en"))("add_limit");
      const limitDurationSwitch = page
        .locator("fieldset")
        .filter({ hasText: limitDuration })
        .getByRole("switch");

      await limitDurationSwitch.click();
      await page.getByRole("button", { name: addlimit }).click();
      await expect(page.getByTestId("add-limit")).toHaveCount(2);
      await limitDurationSwitch.click();
    },
    checkLimitFutureBookings: async () => {
      const limitFutureBookings = (await localize("en"))("limit_future_bookings");
      const limitBookingsSwitch = page
        .locator("fieldset")
        .filter({ hasText: limitFutureBookings })
        .getByRole("switch");

      await limitBookingsSwitch.click();
      await page.locator("#RANGE").click();
      await expect(page.locator("#RANGE")).toBeChecked();
      await limitBookingsSwitch.click();
    },
    checkTimeSlotsCount: async (eventTypePage: Page, count: number) => {
      await expect(eventTypePage.getByTestId("time")).toHaveCount(count);
    },
    getAITranslationToggleDisabled: async () => {
      await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
      await page.waitForSelector('[data-testid="ai_translation_toggle"]', {
        timeout: 5000,
        state: "attached",
      });
      const toggle = page.getByTestId("ai_translation_toggle");
      return (await toggle.getAttribute("disabled")) !== null;
    },
    toggleAITranslation: async () => {
      await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
      await page.getByTestId("ai_translation_toggle").click();
    },
    updateEventTypeDescription: async (description: string) => {
      await page.getByTestId("editor-input").fill(description);
    },
  };
}
