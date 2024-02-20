import { test } from "../../lib/fixtures";

test.describe("Collective event type", () => {
  const teamEventTitle = "Test Managed Event Type";
  let userId: number;
  test.beforeEach(async ({ page, users, bookingPage }) => {
    const userFixture = await users.create(
      { name: "testuser" },
      { hasTeam: true, schedulingType: "COLLECTIVE", teamEventTitle }
    );
    await userFixture.apiLogin();
    userId = userFixture.id;
    await page.goto("/event-types");
    await bookingPage.goToEventType(teamEventTitle);
  });
  test("Book a Collective event type", async ({ bookingPage }) => {
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillEmailAndName(eventTypePage);
    await bookingPage.confirmBooking(eventTypePage);
    await bookingPage.backToBookings(eventTypePage);
    await bookingPage.assertLabelWithCorrectTeamName(eventTypePage, teamEventTitle);
    await bookingPage.assertBookingWithCorrectTitleAndDescription(eventTypePage, {
      profileName: "testuser",
      bookingName: teamEventTitle,
      teamName: `user-id-${userId}'s Team`,
    });
    await bookingPage.clickOnBooking(eventTypePage, teamEventTitle);
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBookingWithReason(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
  test("Book a Collective event type (with added guest)", async ({ bookingPage }) => {
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillEmailAndName(eventTypePage);
    await bookingPage.addGuests(eventTypePage, { guests: ["test@example.com"] });
    await bookingPage.confirmBooking(eventTypePage);
    await bookingPage.backToBookings(eventTypePage);
    await bookingPage.assertLabelWithCorrectTeamName(eventTypePage, teamEventTitle);
    await bookingPage.assertBookingWithCorrectTitleAndDescription(eventTypePage, {
      profileName: "testuser",
      bookingName: teamEventTitle,
      teamName: `user-id-${userId}'s Team`,
      aditionalGuestEmail: "test@example.com",
    });
    await bookingPage.clickOnBooking(eventTypePage, teamEventTitle);
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBookingWithReason(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
});
