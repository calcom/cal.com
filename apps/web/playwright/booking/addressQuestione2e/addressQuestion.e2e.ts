import { loginUser } from "../../fixtures/regularBookings";
import { test } from "../../lib/fixtures";

test.describe("Booking With Address Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
  });

  test.describe("Booking With Address Question and Checkbox Group Question", () => {
    test("Address required and checkbox group required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Checkbox Group question (both required)",
        secondQuestion: "checkbox",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and checkbox group not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Checkbox Group question (only address required)",
        secondQuestion: "checkbox",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Checkbox Question", () => {
    test("Address required and checkbox required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Checkbox question (both required)",
        secondQuestion: "boolean",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Addres and checkbox not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Checkbox question (only address required)",
        secondQuestion: "boolean",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Long text Question", () => {
    test("Addres required and Long Text required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Long Text question (both required)",
        secondQuestion: "textarea",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and Long Text not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Long Text question (only address required)",
        secondQuestion: "textarea",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Multi email Question", () => {
    test("Address required and Multi email required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
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
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multiemail question (both required)",
        secondQuestion: "multiemail",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and Multi email not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
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
        question: "address",
        fillText: "Test Address question and Multiemail question (only address required)",
        secondQuestion: "multiemail",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and multiselect Question", () => {
    test("Address required and multiselect text required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multi Select question (both required)",
        secondQuestion: "multiselect",
        options: { ...bookingOptions, isMultiSelect: true },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and multiselect text not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multi Select question (only address required)",
        secondQuestion: "multiselect",
        options: { ...bookingOptions, isMultiSelect: true, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Number Question", () => {
    test("Address required and Number required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Number question (both required)",
        secondQuestion: "number",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and Number not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Number question (only address required)",
        secondQuestion: "number",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Phone Question", () => {
    test("Address required and Phone required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone-test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multi Select question (both required)",
        secondQuestion: "phone",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and Phone not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", false, "phone-test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multi Select question (only address required)",
        secondQuestion: "phone",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Radio group Question", () => {
    test("Address required and Radio group required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Radio question (both required)",
        secondQuestion: "radio",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and Radio group not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Radio question (only address required)",
        secondQuestion: "radio",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and select Question", () => {
    test("Address required and select required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Select question (both required)",
        secondQuestion: "select",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and select not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Select question (both required)",
        secondQuestion: "select",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Address Question and Short text question", () => {
    test("Address required and Short text required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multi Select question (both required)",
        secondQuestion: "text",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Address and Short text not required", async ({ bookingPage }) => {
      await bookingPage.goToEventType("30 min");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "address",
        fillText: "Test Address question and Multi Select question (only address required)",
        secondQuestion: "text",
        options: { ...bookingOptions, isRequired: true },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });
});
