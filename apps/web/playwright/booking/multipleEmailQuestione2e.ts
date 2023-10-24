import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Multiple Email Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test.describe("Booking With Multiple Email Question and Address Question", () => {
    test("Multiple Email required and Address required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and Address not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Address question (only Multiple Email required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and checkbox group Question", () => {
    test("Multiple Email required and checkbox group required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and checkbox group question (both required)",
        secondQuestion: "checkbox",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and checkbox group not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and checkbox group question (only Multiple Email required)",
        secondQuestion: "checkbox",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and checkbox Question", () => {
    test("Multiple Email required and checkbox required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and checkbox question (both required)",
        secondQuestion: "boolean",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and checkbox not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and checkbox (only Multiple Email required)",
        secondQuestion: "boolean",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and Long text Question", () => {
    test("Multiple Email required and Long text required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Long Text question (both required)",
        secondQuestion: "textarea",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and Long text not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Long Text question (only Multiple Email required)",
        secondQuestion: "textarea",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and multiselect Question", () => {
    test("Multiple Email required and multiselect text required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Multi Select question (both required)",
        secondQuestion: "multiselect",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and multiselect text not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Multi Select question (only  Multiple Email required)",
        secondQuestion: "multiselect",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and Number Question", () => {
    test("Multiple Email required and Number required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Number question (both required)",
        secondQuestion: "number",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and Number not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Number question (only Multiple Email required)",
        secondQuestion: "number",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple email Question and phone Question", () => {
    test("Multiple email required and Phone required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Phone question (both required)",
        secondQuestion: "phone",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple email and Phone not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("phone", "phone-test", "phone test", false, "phone test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Phone question (both required)",
        secondQuestion: "phone",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and Radio group Question", () => {
    test("Multiple Email required and Radio group required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test  Multiple Email question and Radio question (both required)",
        secondQuestion: "radio",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and Radio group not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiemail",
        fillText: "Test Multiple Email question and Radio question (only  Multiple Email required)",
        secondQuestion: "radio",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test.describe("Booking With Multiple Email Question and select Question", () => {
      test("Multiple Email required and select required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiemail",
          "multiemail-test",
          "multiemail test",
          true,
          "multiemail test"
        );
        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiemail",
          fillText: "Test Multiple Email question and Select question (both required)",
          secondQuestion: "select",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Multiple Email and select not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiemail",
          "multiemail-test",
          "multiemail test",
          true,
          "multiemail test"
        );
        await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiemail",
          fillText: "Test Multiple Email question and Select question (only Multiple Email required)",
          secondQuestion: "select",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Multiple Email Question and Short text question", () => {
      test("Multiple Email required and Short text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiemail",
          "multiemail-test",
          "multiemail test",
          true,
          "multiemail test"
        );
        await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiemail",
          fillText: "Test Multiple Email question and Text question (both required)",
          secondQuestion: "text",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Multiple Email and Short text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiemail",
          "multiemail-test",
          "multiemail test",
          true,
          "multiemail test"
        );
        await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiemail",
          fillText: "Test Multiple Email question and Text question (only Multiple Email required)",
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
