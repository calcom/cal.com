import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Check availability tab in a event-type", () => {
  test("Check availability in event type", async ({ eventTypePage, users }) => {
    await loginUser(users);
    await eventTypePage.goToEventTypesPage();

    await eventTypePage.goToEventType("30 min");
    await eventTypePage.goToTab("availability");
    await eventTypePage.checkAvailabilityTab();
  });
});
