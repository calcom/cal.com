import { login } from "../../../fixtures/users";
import { test } from "../../../lib/fixtures";
import { localize } from "../../../lib/testUtils";

test.beforeAll(async ({ page, bookingPage }) => {
  await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
  await page.goto("/event-types");
  await bookingPage.createTeam("Test Team");
  await bookingPage.createTeamEventType("Test Collective Event Type", { isCollectiveType: true });
});

test.describe("Booking With Phone Question and Each Other Question", async () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.describe("Booking With Phone Question and Address Question", () => {
    test("Phone and Address required", async ({ bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and Address not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("address", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
  });

  test.describe("Booking With Phone Question and checkbox group Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Phone and checkbox group required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("address");
      await bookingPage.addQuestion("checkbox", "checkbox-test", "checkbox test", true);
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and checkbox group not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("checkbox", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
    test("Phone and checkbox required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("checkbox");
      await bookingPage.addQuestion("boolean", "boolean-test", "boolean test", true);

      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
    test("Phone required and checkbox not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("boolean", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
  test.describe("Booking With Phone Question and Long Question", () => {
    test("Phone and long question required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("boolean");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true);

      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
        question: "phone",
        fillText: "Test Phone question and long question question (both required)",
        secondQuestion: "textarea",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
    test("Phone required and long question not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("textarea", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
        question: "phone",
        fillText: "Test Phone question and long question (only phone required)",
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
    test("Phone and Multi email required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("textarea");
      await bookingPage.addQuestion(
        "multiemail",
        "multiemail-test",
        "multiemail test",
        true,
        "multiemail test"
      );
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and Multi email not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("multiemail", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
    test("Phone and multiselect text required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("multiemail");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
        question: "phone",
        fillText: "Test Phone question and Multi Phone question (both required)",
        secondQuestion: "multiselect",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Phone required and multiselect text not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("multiselect", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
        question: "phone",
        fillText: "Test Phone question and Multi Phone question (only phone required)",
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
    test("Phone and Number required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("multiselect");
      await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and Number not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("number", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
    test("Phone and Radio group required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("number");
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and Radio group not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("radio", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
    test("Phone and select required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("radio");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and select not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("phone", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
    test("Phone and Short text required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("phone");
      await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Phone required and Short text not required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("text", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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
