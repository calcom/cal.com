/* eslint-disable playwright/valid-expect */
import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.beforeEach(async ({ page, users, bookingPage }) => {
  await loginUser(users);
  await page.goto("/event-types");
  await bookingPage.createTeam("Test Team");
  await bookingPage.goToTab("Back");
  await bookingPage.createManagedEventType("Test Managed Event Type");
  await bookingPage.goToEventType("Event Types");
  await bookingPage.assertBookingIsVisible("Test Managed Event Type");
  await bookingPage.goToEventType("Test Managed Event Type");
  await bookingPage.goToTab("event_advanced_tab_title");
});

test.describe("Check advanced options in a managed team event type", () => {
  test("Check advanced options in a managed team event type without offer seats", async ({ bookingPage }) => {
    await bookingPage.checkRequiresConfirmation();
    await bookingPage.checkRequiresBookerEmailVerification();
    await bookingPage.checkHideNotes();
    await bookingPage.checkRedirectOnBooking();
    await bookingPage.checkEnablePrivateUrl();
    await bookingPage.checkLockTimezone();
    await bookingPage.updateEventType({ shouldCheck: true });
    await bookingPage.goToEventTypesPage();

    await bookingPage.checkEventType(false);
  });

  test("Check advanced options in a managed team event type with offer seats", async ({ bookingPage }) => {
    await bookingPage.checkRequiresConfirmation();
    await bookingPage.checkRequiresBookerEmailVerification();
    await bookingPage.checkHideNotes();
    await bookingPage.checkRedirectOnBooking();
    await bookingPage.checkEnablePrivateUrl();
    await bookingPage.toggleOfferSeats();
    await bookingPage.checkLockTimezone();
    await bookingPage.updateEventType({ shouldCheck: true });
    await bookingPage.goToEventTypesPage();

    await bookingPage.checkEventType(true);
  });
});
