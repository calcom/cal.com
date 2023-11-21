import { test } from "../../../lib/fixtures";
import { localize } from "../../../lib/testUtils";

test.describe("Booking With Select Question and Each Other Question", () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.beforeEach(async ({ page, users, bookingPage }) => {
    const teamEventTitle = "testevent";
    const userFixture = await users.create({ name: "testuser" }, { hasTeam: true, teamEventTitle });
    await userFixture.apiLogin();

    await page.goto("/event-types");
    await bookingPage.goToEventType(teamEventTitle);
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  test.describe("Booking With Select Question and Address Question", () => {
    test("Select and Address required", async ({ bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

      await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "select",
        fillText: "Test Select question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Select required and Address not required", async ({ bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

      await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
      await bookingPage.addQuestion("address", "address-test", "address test", false, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "select",
        fillText: "Test Select question and Address question (only select required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test.describe("Booking With Select Question and checkbox group Question", () => {
      test("Select and checkbox group required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and checkbox group question (both required)",
          secondQuestion: "checkbox",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and checkbox group not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and checkbox group question (only select required)",
          secondQuestion: "checkbox",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and checkbox Question", () => {
      test("Select and checkbox required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and checkbox question (both required)",
          secondQuestion: "boolean",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
      test("Select required and checkbox not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and checkbox (only select required)",
          secondQuestion: "boolean",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and Long text Question", () => {
      test("Select and Long text required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Long Text question (both required)",
          secondQuestion: "textarea",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and Long text not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", false, "textarea test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Long Text question (only select required)",
          secondQuestion: "textarea",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and Multi email Question", () => {
      test("Select and Multi email required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
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
          question: "select",
          fillText: "Test Select question and Multi Email question (both required)",
          secondQuestion: "multiemail",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and Multi email not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
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
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Multi Email question (only select required)",
          secondQuestion: "multiemail",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and multiselect Question", () => {
      test("Select and multiselect text required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Multi Select question (both required)",
          secondQuestion: "multiselect",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and multiselect text not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Multi Select question (only select required)",
          secondQuestion: "multiselect",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and Number Question", () => {
      test("Select and Number required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Number question (both required)",
          secondQuestion: "number",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and Number not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("number", "number-test", "number test", false, "number test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Number question (only select required)",
          secondQuestion: "number",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and Radio group Question", () => {
      test("Select and Radio group required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Radio question (both required)",
          secondQuestion: "radio",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and Radio group not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("radio", "radio-test", "radio test", false);
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Radio question (only select required)",
          secondQuestion: "radio",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and select Question", () => {
      test("Select and phone required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Select question (both required)",
          secondQuestion: "phone",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and select not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("select", "select-test", "select test", false, "select test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Select question (only select required)",
          secondQuestion: "select",
          options: { ...bookingOptions, isRequired: false },
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });
    });

    test.describe("Booking With Select Question and Short text question", () => {
      test("Select and Short text required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Text question (both required)",
          secondQuestion: "text",
          options: bookingOptions,
        });
        await bookingPage.rescheduleBooking(eventTypePage);
        await bookingPage.assertBookingRescheduled(eventTypePage);
        await bookingPage.cancelBooking(eventTypePage);
        await bookingPage.assertBookingCanceled(eventTypePage);
      });

      test("Select required and Short text not required", async ({ bookingPage }) => {
        const shareText = (await localize("en"))("share_additional_notes");

        await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
        await bookingPage.addQuestion("text", "text-test", "text test", false, "text test");
        await bookingPage.updateEventType();
        const eventTypePage = await bookingPage.previewEventType();
        await bookingPage.selectTimeSlot(eventTypePage);
        await bookingPage.fillAndConfirmBooking({
          eventTypePage,
          placeholderText: shareText,
          question: "select",
          fillText: "Test Select question and Text question (only select required)",
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
