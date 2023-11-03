import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Radio Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test.describe("Booking With Radio Question and Address Question", () => {
    test("Radio required and Address required", async ({ bookingPage }) => {
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "radio",
        fillText: "Test Radio question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Radio and Address not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "radio",
        fillText: "Test Radio question and Address question (only radio required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test.describe("Booking With Radio Question and checkbox group Question", () => {
      test("Radio required and checkbox group required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and checkbox group question (both required)",
          secondQuestion: "checkbox",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and checkbox group not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and checkbox group question (only radio required)",
          secondQuestion: "checkbox",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and checkbox Question", () => {
      test("Radio required and checkbox required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and checkbox question (both required)",
          secondQuestion: "boolean",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
      test("Radio and checkbox not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and checkbox (only radio required)",
          secondQuestion: "boolean",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and Long text Question", () => {
      test("Radio required and Long text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Long Text question (both required)",
          secondQuestion: "textarea",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and Long text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Long Text question (only radio required)",
          secondQuestion: "textarea",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and Multi email Question", () => {
      test("Radio required and Multi email required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
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
          question: "radio",
          fillText: "Test Radio question and Multi Email question (both required)",
          secondQuestion: "multiemail",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and Multi email not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
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
          question: "radio",
          fillText: "Test Radio question and Multi Email question (only radio required)",
          secondQuestion: "multiemail",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and multiselect Question", () => {
      test("Radio required and multiselect text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Multi Select question (both required)",
          secondQuestion: "multiselect",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and multiselect text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Multi Select question (only radio required)",
          secondQuestion: "multiselect",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and Number Question", () => {
      test("Radio required and Number required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Number question (both required)",
          secondQuestion: "number",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and Number not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Number question (only radio required)",
          secondQuestion: "number",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and Phone Question", () => {
      test("Radio required and Phone required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Phone question (both required)",
          secondQuestion: "phone",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and Phone not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("phone", "phone-test", "phone test", false, "phone test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Phone question (only radio required)",
          secondQuestion: "phone",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and select Question", () => {
      test("Radio required and select required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Select question (both required)",
          secondQuestion: "select",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and select not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Select question (only radio required)",
          secondQuestion: "select",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Radio Question and Short text question", () => {
      test("Radio required and Short text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Text question (both required)",
          secondQuestion: "text",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Radio and Short text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "radio",
          fillText: "Test Radio question and Text question (only radio required)",
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
