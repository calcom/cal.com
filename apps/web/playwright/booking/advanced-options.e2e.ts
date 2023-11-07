import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Check all advanced options in a regular event-type", () => {
  test("Check advanced options in a regular event type", async ({ bookingPage, users }) => {
    await loginUser(users);
    await bookingPage.goToEventTypesPage();

    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");

    await bookingPage.checkRequiresBookerEmailVerification();
    await bookingPage.checkHideNotes();
    await bookingPage.checkRedirectOnBooking();
    await bookingPage.checkEnablePrivateUrl();
    await bookingPage.toggleOfferSeats();
    await bookingPage.checkLockTimezone();
    await bookingPage.checkRequiresConfirmation();
    await bookingPage.updateEventType();
    await bookingPage.goToEventTypesPage();

    await bookingPage.checkEventType();
  });
});
