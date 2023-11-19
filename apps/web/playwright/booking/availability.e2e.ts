import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Check availability tab in a event-type", () => {
  test("Check availability in event type", async ({ bookingPage, users, page }) => {
    await loginUser(users);
    await bookingPage.goToEventTypesPage();

    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("availability");
    await bookingPage.checkAvailabilityTab();
    await bookingPage.goToAvailabilityPage();
    await bookingPage.checkAvailabilityPage();
  });
});
