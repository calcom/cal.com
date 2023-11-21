import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Phone Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test.describe("Booking With Phone Question and Address Question", () => {
    test("Phone and Address required", async ({ bookingPage }) => {
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "phone",
        fillText: "Test Phone question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Phone required and Address not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "phone",
        fillText: "Test Phone question and Address question (only phone required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test.describe("Booking With Phone Question and checkbox group Question", () => {
      const bookingOptions = { hasPlaceholder: false, isRequired: true };
      test("Phone and checkbox group required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and checkbox group question (both required)",
          secondQuestion: "checkbox",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and checkbox group not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and checkbox group question (only phone required)",
          secondQuestion: "checkbox",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and checkbox Question", () => {
      test("Phone and checkbox required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and checkbox question (both required)",
          secondQuestion: "boolean",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
      test("Phone required and checkbox not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and checkbox (only phone required)",
          secondQuestion: "boolean",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and Long text Question", () => {
      test("Phone and Long text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Long Text question (both required)",
          secondQuestion: "textarea",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and Long text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Long Text question (only phone required)",
          secondQuestion: "textarea",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and Multi email Question", () => {
      const bookingOptions = { hasPlaceholder: true, isRequired: true };
      test("Phone and Multi email required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
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
          question: "phone",
          fillText: "Test Phone question and Multi Email question (both required)",
          secondQuestion: "multiemail",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and Multi email not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
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
          question: "phone",
          fillText: "Test Phone question and Multi Email question (only phone required)",
          secondQuestion: "multiemail",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and multiselect Question", () => {
      test("Phone and multiselect text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Multi Select question (both required)",
          secondQuestion: "multiselect",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and multiselect text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Multi Select question (only phone required)",
          secondQuestion: "multiselect",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and Number Question", () => {
      test("Phone and Number required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Number question (both required)",
          secondQuestion: "number",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and Number not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Number question (only phone required)",
          secondQuestion: "number",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and Radio group Question", () => {
      test("Phone and Radio group required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Radio question (both required)",
          secondQuestion: "radio",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and Radio group not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Radio question (only phone required)",
          secondQuestion: "radio",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and select Question", () => {
      test("Phone and select required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Select question (both required)",
          secondQuestion: "select",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and select not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Select question (only phone required)",
          secondQuestion: "select",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Phone Question and Short text question", () => {
      test("Phone and Short text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Text question (both required)",
          secondQuestion: "text",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Phone required and Short text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "phone",
          fillText: "Test Phone question and Text question (only phone required)",
          secondQuestion: "text",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });
  });
});
