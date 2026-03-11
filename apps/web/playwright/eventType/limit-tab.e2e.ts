import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Limits Tab - Event Type", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("Test Event");
    await bookingPage.goToTab("event_limit_tab_title");
  });

  test("Check the functionalities of the Limits Tab", async ({ bookingPage }) => {
    await bookingPage.checkLimitBookingFrequency();
    await bookingPage.checkLimitBookingDuration();
    await bookingPage.checkLimitFutureBookings();
    await bookingPage.checkBufferTime();

    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();

    await eventTypePage.waitForTimeout(10000);

    const counter = await eventTypePage.getByTestId("time").count();
    await bookingPage.checkTimeSlotsCount(eventTypePage, counter);
  });
});
