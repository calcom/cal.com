import { test } from "../../../lib/fixtures";
import { localize } from "../../../lib/testUtils";

test.describe("Booking for Address Question and each question as custom/required ", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ users, page, bookingPage }) => {
    const teamEventTitle = "testevent";
    const userFixture = await users.create({ name: "testuser" }, { hasTeam: true, teamEventTitle });
    await userFixture.apiLogin();

    await page.goto("/event-types");
    await bookingPage.goToEventType(teamEventTitle);
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test("Schedule a meeting with address input + phone input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and Phone question",
      secondQuestion: "phone",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + number input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and Number question",
      secondQuestion: "number",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + long text input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and Long text question",
      secondQuestion: "textarea",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + select input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and select question",
      secondQuestion: "select",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + multi-select input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and multi select question",
      secondQuestion: "multiselect",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + multi-emails input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion(
      "multiemail",
      "multiemail-test",
      "multiemail test",
      true,
      "multiemail test"
    );
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and multi-emails question",
      secondQuestion: "multiemail",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + checkbox group input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and checkbox group question",
      secondQuestion: "checkbox",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + radio group input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and radio group question",
      secondQuestion: "radio",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Schedule a meeting with address input + checkbox input", async ({ bookingPage }) => {
    const shareText = (await localize("en"))("share_additional_notes");
    await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
    await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: shareText,
      question: "address",
      fillText: "Test Address question and checkbox question",
      secondQuestion: "boolean",
      options: bookingOptions,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
});
