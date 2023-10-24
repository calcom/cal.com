import { login } from "../fixtures/users";
import { test } from "../lib/fixtures";

test.describe("Test the timezone behavior in specific cases", () => {
  test("Change timezone in booking page", async ({ page, bookingPage }) => {
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    await page.goto("/event-types");
    await bookingPage.checkUpdateTimezone();
    await bookingPage.goToEventTypePage();

    // Create a new event type
    await bookingPage.createRegularEventType("15 min test timezone");

    // Schedule a booking changing the timezone to America/New_York
    const bookingSchedulingPage = await bookingPage.previewEventType();
    await bookingPage.selectTimezone("America/New York", bookingSchedulingPage);
    await bookingPage.assertRightTimezone("America/New York", bookingSchedulingPage);
    await bookingPage.selectFirstAvailableTime(bookingSchedulingPage);

    // Check if the correct timezone is displayed and if the meeting was scheduled successfully
    await bookingPage.assertRightTimezone("America/New York", bookingSchedulingPage, {
      inConfirmationPage: true,
      shouldConfirmBooking: true,
    });
    await bookingPage.goToEventType("Back to bookings", bookingSchedulingPage);

    // Check if the icon globe is displayed in the bookings page and if the correct timezone is displayed when we click on it
    await bookingPage.assertCorrectTimezoneInGlobeButton("America/New York", bookingSchedulingPage);

    // Cancel the meeting in upcoming bookings page
    await bookingPage.cancelUpcomingBooking("15 min test timezone", bookingSchedulingPage);
    await bookingPage.assertBookingCanceled(bookingSchedulingPage);

    // Delete the event-type
    await bookingPage.goToEventTypePage(bookingSchedulingPage);
    await bookingPage.deleteEventType("15 min test timezone", bookingSchedulingPage);
  });
});
