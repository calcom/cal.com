/* eslint-disable playwright/no-conditional-in-test */
import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Booking with recurring checked", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("recurring");
  });

  test("Updates event type with recurring events", async ({ page, bookingPage }) => {
    await bookingPage.updateRecurringTab("2", "3");
    await bookingPage.updateEventType();
    await page.getByRole("link", { name: "Event Types" }).click();
    await bookingPage.assertRepeatEventType();
  });

  test("Updates and shows recurring schedule correctly in booking page", async ({ bookingPage }) => {
    await bookingPage.updateRecurringTab("2", "3");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.fillRecurringFieldAndConfirm(eventTypePage);
  });
});
