import { expect } from "@playwright/test";

import { loginUser } from "./fixtures/regularBookings";
import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { bookEventOnThisPage, bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

const checkIfCalVideoIsUniqueLocation = async (bookingPage: Fixtures["bookingPage"]) => {
  const eventTypePage = await bookingPage.previewEventType();
  await expect(eventTypePage.getByTestId("unique-location")).toHaveText("Cal Video");
  await bookEventOnThisPage(eventTypePage);
  eventTypePage.getByText("Cal Video: Meeting url is in the confirmation email");
};

test.describe("Test Cal Video App", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("should set Cal Video as unique location and book a meeting successfully", async ({
    page,
    users,
    bookingPage,
  }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.addLocation("Cal Video (Global)");
    await bookingPage.updateEventType();
    await checkIfCalVideoIsUniqueLocation(bookingPage);
  });

  test("should use Cal Video as default location and book a meeting successfully", async ({
    users,
    bookingPage,
  }) => {
    await loginUser(users);
    await bookingPage.createEventType("CalVideo");
    await checkIfCalVideoIsUniqueLocation(bookingPage);
  });

  test("should set Cal Video as one of locations and book a meeting successfully", async ({
    users,
    bookingPage,
  }) => {
    await loginUser(users);
    await bookingPage.createEventType("CalVideo");
    await bookingPage.addLocation("In Person (Attendee Address)");
    await bookingPage.addNewLocation("Cal Video (Global)");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await expect(eventTypePage.getByTestId("available-locations")).toHaveText("2 location options");
    selectFirstAvailableTimeSlotNextMonth(eventTypePage);
    await eventTypePage.locator(`[data-fob-field-name="location"]`).getByText("Cal Video").click();
    await bookTimeSlot(eventTypePage);
    eventTypePage.getByText("Cal Video: Meeting url is in the confirmation email");
  });
});
