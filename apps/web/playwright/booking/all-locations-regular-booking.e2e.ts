/* eslint-disable playwright/no-conditional-in-test */
import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Add Locations in a regular booking", () => {
  const locationTypes = ["Cal Video", "In Person (Attendee Address)", "Attendee Phone Number"];
  const customLocationTypes = ["In Person (Organizer Address)", "Link meeting", "Organizer Phone Number"];

  test.beforeEach(async ({ page, users, bookingPage }) => {
    loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_setup_tab_title");
    await bookingPage.editEventType();
  });

  for (const location of locationTypes) {
    test(`Add the ${location} location and schedule a meeting`, async ({ bookingPage }) => {
      await bookingPage.selectLocation(location);
      await bookingPage.verifyTextVisibility(location);
      await bookingPage.updateEventType();

      const scheduleBookingPage = await bookingPage.previewEventType();
      await bookingPage.selectFirstAvailableTime(scheduleBookingPage);

      location === "In Person (Attendee Address)" &&
        (await bookingPage.fillBookingFormLocation(scheduleBookingPage, location));
      location === "Attendee Phone Number" &&
        (await bookingPage.fillBookingFormLocation(scheduleBookingPage, "+55 32 988776655", location));

      await bookingPage.confirmBooking(scheduleBookingPage);
      await bookingPage.clickReschedule(scheduleBookingPage);
      await bookingPage.selectFirstAvailableTime(scheduleBookingPage);
      await bookingPage.fillRescheduleReasonAndConfirm(scheduleBookingPage);
      await bookingPage.assertBookingScheduled(scheduleBookingPage);
      await bookingPage.cancelBookingWithReason(scheduleBookingPage);
    });
  }

  for (const customLocation of customLocationTypes) {
    test(`Add the ${customLocation} location and schedule a meeting (display on booking page checked)`, async ({
      page,
      bookingPage,
    }) => {
      await bookingPage.selectLocation(customLocation);
      await bookingPage.verifyTextVisibility(customLocation);
      await bookingPage.fillLocationInformation(customLocation, page);
      await bookingPage.updateEventType();

      const scheduleBookingPage = await bookingPage.previewEventType();

      await bookingPage.assertLocationAdded(scheduleBookingPage, customLocation);
      await bookingPage.selectFirstAvailableTime(scheduleBookingPage);

      await bookingPage.assertLocationAdded(scheduleBookingPage, customLocation);
      await bookingPage.confirmBooking(scheduleBookingPage);
      await bookingPage.clickReschedule(scheduleBookingPage);
      await bookingPage.selectFirstAvailableTime(scheduleBookingPage);
      await bookingPage.fillRescheduleReasonAndConfirm(scheduleBookingPage);
      await bookingPage.assertBookingScheduled(scheduleBookingPage);
      await bookingPage.cancelBookingWithReason(scheduleBookingPage);
    });
  }

  for (const customLocation of customLocationTypes) {
    test(`Add the ${customLocation} location and schedule a meeting (display on booking page not checked)`, async ({
      page,
      bookingPage,
    }) => {
      await bookingPage.selectLocation(customLocation);
      await bookingPage.verifyTextVisibility(customLocation);
      await bookingPage.fillLocationInformation(customLocation, page);
      await bookingPage.updateEventType();

      const scheduleBookingPage = await bookingPage.previewEventType();

      await bookingPage.assertLocationAdded(scheduleBookingPage, customLocation);
      await bookingPage.selectFirstAvailableTime(scheduleBookingPage);

      await bookingPage.assertLocationAdded(scheduleBookingPage, customLocation);
      await bookingPage.confirmBooking(scheduleBookingPage);
      await bookingPage.clickReschedule(scheduleBookingPage);
      await bookingPage.selectFirstAvailableTime(scheduleBookingPage);
      await bookingPage.fillRescheduleReasonAndConfirm(scheduleBookingPage);
      await bookingPage.assertBookingScheduled(scheduleBookingPage);
      await bookingPage.cancelBookingWithReason(scheduleBookingPage);
    });
  }

  test("Add all available locations and try to schedule a meeting", async ({ bookingPage }) => {
    await bookingPage.selectLocation("Cal Video", {
      shouldAddAnother: true,
      additionalLocations: [
        "In Person (Attendee Address)",
        "Attendee Phone Number",
        "In Person (Organizer Address)",
        "Link meeting",
        "Organizer Phone Number",
      ],
    });
    const allLocations = locationTypes.concat(customLocationTypes);
    await bookingPage.updateEventType();

    const scheduleBookingPage = await bookingPage.previewEventType();

    await bookingPage.assertMultipleLocationsAdded(scheduleBookingPage, allLocations, { shouldHover: true });

    await bookingPage.selectFirstAvailableTime(scheduleBookingPage);
    await bookingPage.assertMultipleLocationsAdded(scheduleBookingPage, allLocations);

    await bookingPage.confirmBooking(scheduleBookingPage);
    await bookingPage.clickReschedule(scheduleBookingPage);
    await bookingPage.selectFirstAvailableTime(scheduleBookingPage);
    await bookingPage.assertMultipleLocationsAdded(scheduleBookingPage, allLocations);

    await bookingPage.fillRescheduleReasonAndConfirm(scheduleBookingPage);
    await bookingPage.assertBookingScheduled(scheduleBookingPage);
    await bookingPage.cancelBookingWithReason(scheduleBookingPage);
  });
});
