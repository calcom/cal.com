/* eslint-disable playwright/no-conditional-in-test */
import { test } from "../../../lib/fixtures";

test.describe("Collective Booking With All Questions", () => {
  test("Selecting and filling all questions as required (Collective Event)", async ({
    page,
    users,
    bookingPage,
  }) => {
    const teamEventTitle = "Test Managed Event Type";
    const userFixture = await users.create(
      { name: "testuser" },
      { hasTeam: true, schedulingType: "COLLECTIVE", teamEventTitle }
    );
    await userFixture.apiLogin();
    await page.goto("/event-types");
    await bookingPage.goToEventType(teamEventTitle);
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await eventTypePage.getByLabel("Your Name*").fill("testuser");
    await bookingPage.fillAllQuestions(eventTypePage, [], {});

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
});
