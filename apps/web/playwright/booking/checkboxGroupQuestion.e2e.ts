import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Checkbox Group Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test.describe("Booking With Checkbox Group Question and Address Question", () => {
    test("Checkbox Group required and Address required", async ({ bookingPage }) => {
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "checkbox",
        fillText: "Test Checkbox Group question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Checkbox Group and Address not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
      await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "checkbox",
        fillText: "Test Checkbox Group question and Address question (only checkbox required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test.describe("Booking With Checkbox Group Question and Phone Question", () => {
      test("Checkbox Group required and Phone required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and phone question (both required)",
          secondQuestion: "phone",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and Phone not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("phone", "phone-test", "phone test", false, "phone test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Phone question (only checkbox required)",
          secondQuestion: "phone",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and checkbox Question", () => {
      test("Checkbox Group required and checkbox required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and checkbox question (both required)",
          secondQuestion: "boolean",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and checkbox not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and checkbox (only checkbox required)",
          secondQuestion: "boolean",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and Long text Question", () => {
      test("Checkbox Group required and Long text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Long Text question (both required)",
          secondQuestion: "textarea",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and Long text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Long Text question (only checkbox required)",
          secondQuestion: "textarea",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and Multi email Question", () => {
      test("Checkbox Group required and Multi email required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
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
          question: "checkbox",
          fillText: "Test Checkbox Group question and Multi Email question (both required)",
          secondQuestion: "multiemail",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and Multi email not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
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
          question: "checkbox",
          fillText: "Test Checkbox Group question and Multi Email question (only checkbox required)",
          secondQuestion: "multiemail",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and multiselect Question", () => {
      test("Checkbox Group required and multiselect text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Multi Select question (both required)",
          secondQuestion: "multiselect",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and multiselect text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Multi Select question (only checkbox required)",
          secondQuestion: "multiselect",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and Number Question", () => {
      test("Checkbox Group required and Number required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Number question (both required)",
          secondQuestion: "number",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and Number not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Number question (only checkbox required)",
          secondQuestion: "number",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and Radio group Question", () => {
      test("Checkbox Group required and Radio group required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Radio question (both required)",
          secondQuestion: "radio",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and Radio group not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Radio question (only checkbox required)",
          secondQuestion: "radio",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and select Question", () => {
      test("Checkbox Group required and select required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Select question (both required)",
          secondQuestion: "select",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and select not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Select question (only checkbox required)",
          secondQuestion: "select",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Checkbox Group Question and Short text question", () => {
      test("Checkbox Group required and Short Text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Text question (both required)",
          secondQuestion: "text",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Checkbox Group and Short Text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "checkbox",
          fillText: "Test Checkbox Group question and Text question (only checkbox required)",
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
