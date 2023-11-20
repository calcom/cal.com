import { login } from "../../../fixtures/users";
import { test } from "../../../lib/fixtures";
import { localize } from "../../../lib/testUtils";

test.beforeAll(async ({ page, bookingPage }) => {
  await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
  await page.goto("/event-types");
  await bookingPage.createTeam("Test Team");
  await bookingPage.createTeamEventType("Test Collective Event Type", { isCollectiveType: true });
});

test.describe("Booking With Long Text Question and Each Other Question", async () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.describe("Booking With Long Text Question and Address Question", () => {
    test("Long Text and Address required", async ({ bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
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

    test("Long Text required and Address not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Address question (only textarea required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and checkbox group Question", () => {
    test("Long Text and checkbox group required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and checkbox group question (both required)",
        secondQuestion: "checkbox",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and checkbox group not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and checkbox group question (only textarea required)",
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
    test("Long Text and checkbox required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and checkbox question (both required)",
        secondQuestion: "boolean",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
    test("Long Text required and checkbox not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and checkbox (only textarea required)",
        secondQuestion: "boolean",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Multi email Question", () => {
    test("Long Text and Multi email required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("boolean");
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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Multi Email question (both required)",
        secondQuestion: "multiemail",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Multi email not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Multi Email question (only textarea required)",
        secondQuestion: "multiemail",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and multiselect Question", () => {
    test("Long Text and multiselect text required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Multi Long Text question (both required)",
        secondQuestion: "multiselect",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and multiselect text not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Multi Long Text question (only textarea required)",
        secondQuestion: "multiselect",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Number Question", () => {
    test("Long Text and Number required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Number question (both required)",
        secondQuestion: "number",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Number not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Number question (only textarea required)",
        secondQuestion: "number",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Radio group Question", () => {
    test("Long Text and Radio group required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Radio question (both required)",
        secondQuestion: "radio",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Radio group not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Radio question (only textarea required)",
        secondQuestion: "radio",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Phone Question", () => {
    test("Long Text and phone required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Long Text question (both required)",
        secondQuestion: "phone",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Long Text required and Phone not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Long Text question (only textarea required)",
        secondQuestion: "phone",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Long Text Question and Short text question", () => {
    test("Long Text and Short text required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
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

    test("Long Text required and Short text not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");

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
        placeholderText: shareText,
        question: "textarea",
        fillText: "Test Long Text question and Text question (only textarea required)",
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
