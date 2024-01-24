import { randomString } from "@calcom/lib/random";

import { loginUser } from "../../fixtures/regularBookings";
import { test } from "../../lib/fixtures";
import { localize } from "../../lib/testUtils";

test.describe("Create a Team, a Collective Event Type and Book a Meeting", () => {
  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
  });

  test("Create Collective Event type and Book a Meeting", async ({ bookingPage }) => {
    const teamName = `Team example-${randomString(3)}`;
    const backToBookingsText = (await localize("en"))("back_to_bookings");

    await bookingPage.createTeam(teamName);
    await bookingPage.createTeamEventType("test-collective", { isCollectiveType: true });
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);

    await bookingPage.confirmBooking(eventTypePage);
    await bookingPage.goToPage(backToBookingsText, eventTypePage);
    await bookingPage.assertLabelWithCorrectTeamName(eventTypePage, teamName);
    await bookingPage.assertBookingWithCorrectTitleAndDescription(eventTypePage, {
      profileName: "testuser",
      bookingName: "test-collective",
      teamName: teamName,
    });

    await bookingPage.clickOnBooking(eventTypePage, teamName);
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBookingWithReason(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Create Collective Event type and Book a Meeting (with added guest)", async ({ bookingPage }) => {
    const teamName = `Team example-${randomString(3)}`;
    const backToBookingsText = (await localize("en"))("back_to_bookings");

    await bookingPage.createTeam(teamName);
    await bookingPage.createTeamEventType("test-collective", { isCollectiveType: true });
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.addGuests(eventTypePage, { guests: ["test@example.com"] });
    await bookingPage.confirmBooking(eventTypePage);
    await bookingPage.goToPage(backToBookingsText, eventTypePage);
    await bookingPage.assertLabelWithCorrectTeamName(eventTypePage, teamName);
    await bookingPage.assertBookingWithCorrectTitleAndDescription(eventTypePage, {
      profileName: "testuser",
      bookingName: "test-collective",
      teamName: teamName,
      aditionalGuestEmail: "test@example.com",
    });

    await bookingPage.clickOnBooking(eventTypePage, teamName);
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBookingWithReason(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
});
