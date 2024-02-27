import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Long Text Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
  });

  test("Long Text and another required field", async ({ bookingPage }) => {
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
    await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: "Please share anything that will help prepare for our meeting.",
      question: "textarea",
      fillText: "Test Long Text question and Address question (both required)",
      secondQuestion: "address",
      options: bookingOptions,
    });
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Long Text required and another field not required", async ({ bookingPage }) => {
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
    await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
    await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: "Please share anything that will help prepare for our meeting.",
      question: "textarea",
      fillText: "Test Long Text question and Address question (only Long Text required)",
      secondQuestion: "address",
      options: { ...bookingOptions, isRequired: false },
    });
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
});
