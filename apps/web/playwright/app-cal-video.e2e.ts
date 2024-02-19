import { expect } from "@playwright/test";

import { loginUser } from "./fixtures/regularBookings";
import { test } from "./lib/fixtures";
import {
  bookEventOnThisPage,
  bookTimeSlot,
  localize,
  selectFirstAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe("Test Cal Video App", async () => {
  test.beforeEach(({ users }) => users.deleteAll());
  test("should set Cal Video as unique location and book a meeting successfully", async ({
    page,
    users,
    bookingPage,
    emails,
  }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.addLocationToEventType("Cal Video (Global)");
    await bookingPage.updateEventType();

    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertUniqueLocation(eventTypePage, "Cal Video");
    await bookEventOnThisPage(eventTypePage);
    await bookingPage.assertCalVideoLink(eventTypePage, users, emails);
  });

  test("should use Cal Video as default location and book a meeting successfully", async ({
    users,
    bookingPage,
    emails,
  }) => {
    await loginUser(users);
    await bookingPage.createEventType("CalVideo");

    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.assertUniqueLocation(eventTypePage, "Cal Video");
    await bookEventOnThisPage(eventTypePage);
    await bookingPage.assertCalVideoLink(eventTypePage, users, emails);
  });

  test("should set Cal Video as one of locations and book a meeting successfully", async ({
    users,
    bookingPage,
    emails,
  }) => {
    await loginUser(users);
    await bookingPage.createEventType("CalVideo");
    await bookingPage.addLocationToEventType(await (await localize("en"))("in_person_attendee_address"));
    await bookingPage.addNewLocationToEventType("Cal Video (Global)");
    await bookingPage.updateEventType();

    const eventTypePage = await bookingPage.previewEventType();
    await expect(eventTypePage.getByTestId("available-locations")).toHaveText("2 location options");

    await selectFirstAvailableTimeSlotNextMonth(eventTypePage);

    await eventTypePage.locator(`[data-fob-field-name="location"]`).getByText("Cal Video").click();

    await bookTimeSlot(eventTypePage);
    await eventTypePage.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });

    await bookingPage.assertCalVideoLink(eventTypePage, users, emails);
  });
});
