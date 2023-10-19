import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With Multi Select Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.goToEventType("30 min");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test.describe("Booking With Multi Select Question and Address Question", () => {
    test("Multi Select and Address required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiselect",
        "multiselect-test",
        "multiselect test",
        true,
        "multiselect test"
      );
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiselect",
        fillText: "Test Multi Select question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.cancelAndRescheduleBooking(eventTypePage);
    });

    test("Multi Select and Address not required", async ({ bookingPage }) => {
      await bookingPage.addQuestion(
        "multiselect",
        "multiselect-test",
        "multiselect test",
        true,
        "multiselect test"
      );
      await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: "Please share anything that will help prepare for our meeting.",
        question: "multiselect",
        fillText: "Test Multi Select question and Address question (only multiselect required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.cancelAndRescheduleBooking(eventTypePage);
    });

    test.describe("Booking With Multi Select Question and checkbox group Question", () => {
      const bookingOptions = { hasPlaceholder: false, isRequired: true };
      test("Multi Select and checkbox group required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and checkbox group question (both required)",
          secondQuestion: "checkbox",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and checkbox group not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and checkbox group question (only multiselect required)",
          secondQuestion: "checkbox",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and checkbox Question", () => {
      test("Multi Select and checkbox required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and checkbox question (both required)",
          secondQuestion: "boolean",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
      test("Multi Select and checkbox not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and checkbox (only multiselect required)",
          secondQuestion: "boolean",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and Long text Question", () => {
      test("Multi Select and Long text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Long Text question (both required)",
          secondQuestion: "textarea",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and Long text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Long Text question (only multiselect required)",
          secondQuestion: "textarea",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and Multi email Question", () => {
      const bookingOptions = { hasPlaceholder: true, isRequired: true };
      test("Multi Select and Multi email required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
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
          question: "multiselect",
          fillText: "Test Multi Select question and Multi Email question (both required)",
          secondQuestion: "multiemail",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and Multi email not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
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
          question: "multiselect",
          fillText: "Test Multi Select question and Multi Email question (only multiselect required)",
          secondQuestion: "multiemail",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and Phone Question", () => {
      test("Multi Select and multiselect text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Phone question (both required)",
          secondQuestion: "phone",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and multiselect text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Multi Select question (only multiselect required)",
          secondQuestion: "multiselect",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and Number Question", () => {
      test("Multi Select and Number required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Number question (both required)",
          secondQuestion: "number",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and Number not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Number question (only multiselect required)",
          secondQuestion: "number",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and Radio group Question", () => {
      test("Multi Select and Radio group required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Radio question (both required)",
          secondQuestion: "radio",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and Radio group not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Radio question (only multiselect required)",
          secondQuestion: "radio",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and select Question", () => {
      test("Multi Select and select required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Select question (both required)",
          secondQuestion: "select",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and select not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Select question (only multiselect required)",
          secondQuestion: "select",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });

    test.describe("Booking With Multi Select Question and Short text question", () => {
      const bookingOptions = { hasPlaceholder: true, isRequired: true };
      test("Multi Select and Short text required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Text question (both required)",
          secondQuestion: "text",
          options: bookingOptions,
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });

      test("Multi Select and Short text not required", async ({ bookingPage }) => {
        await bookingPage.addQuestion(
          "multiselect",
          "multiselect-test",
          "multiselect test",
          true,
          "multiselect test"
        );
        await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: "Please share anything that will help prepare for our meeting.",
          question: "multiselect",
          fillText: "Test Multi Select question and Text question (only multiselect required)",
          secondQuestion: "text",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.cancelAndRescheduleBooking(eventTypePage);
      });
    });
  });
});
