import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Long Text Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
  });

  test("Long Text and Address required", async ({ bookingPage }) => {
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

  test("Long Text required and Address not required", async ({ bookingPage }) => {
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

  test.describe("Booking With Long Text Question and Checkbox Group Question", () => {
    test("Long Text and Checkbox Group required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Checkbox Group question (both required)",
        secondQuestion: "checkbox",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Checkbox Group not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Checkbox Group question (only Long Text required)",
        secondQuestion: "checkbox",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and checkbox Question", () => {
    test("Long Text and checkbox required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Checkbox question (only Long Text required)",
        secondQuestion: "boolean",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and checkbox not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Checkbox question (only Long Text required)",
        secondQuestion: "boolean",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Multiple email Question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Long Text and Multiple email required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
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
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Multiple email question (both required)",
        secondQuestion: "multiemail",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Multiple email not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        false,
        "multiemail test"
      );
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Multiple email question (only Long Text required)",
        secondQuestion: "multiemail",
        options: { hasPlaceholder: true, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and multiselect Question", () => {
    test("Long Text and multiselect text required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and multiselect question (both required)",
        secondQuestion: "multiselect",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and multiselect text not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and multiselect question (only long text required)",
        secondQuestion: "multiselect",
        options: { hasPlaceholder: false, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Number Question", () => {
    test("Long Text and Number required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Number question (both required)",
        secondQuestion: "multiselect",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test("Long Text required and Number not required", async ({ bookingPage }) => {
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
    await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
    await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAndConfirmBooking({
      eventTypePage,
      placeholderText: "Please share anything that will help prepare for our meeting.",
      question: "textarea",
      fillText: "Test Long Text question and Number question (only Long Textß required)",
      secondQuestion: "multiselect",
      options: { hasPlaceholder: false, isRequired: false },
    });
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test.describe("Booking With Long Text Question and Phone Question", () => {
    test("Long Text and Phone required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Phone question (both required)",
        secondQuestion: "phone",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Phone not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", false, "phone test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Phone question (only Long Text required)",
        secondQuestion: "phone",
        options: { hasPlaceholder: false, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Radio group Question", () => {
    test("Long Text and Radio group required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Radio Group question (both required)",
        secondQuestion: "radio",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Radio group not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Radio Group question (only Long Text required)",
        secondQuestion: "radio",
        options: { hasPlaceholder: false, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and select Question", () => {
    test("Long Text and select required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("select", "select-test", "select test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Select question (both required)",
        secondQuestion: "select",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and select not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("select", "select-test", "select test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Select question (only Long Text required)",
        secondQuestion: "select",
        options: { hasPlaceholder: false, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Short text question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Long Text and Short text required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Text question (both required)",
        secondQuestion: "text",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Short text not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "textarea",
        fillText: "Test Long Text question and Text question (only Long Text required)",
        secondQuestion: "text",
        options: { hasPlaceholder: false, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });
});
