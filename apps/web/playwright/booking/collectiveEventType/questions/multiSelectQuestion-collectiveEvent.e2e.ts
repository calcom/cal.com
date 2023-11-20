import { login } from "../../../fixtures/users";
import { test } from "../../../lib/fixtures";
import { localize } from "../../../lib/testUtils";

test.beforeAll(async ({ page, bookingPage }) => {
  await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
  await page.goto("/event-types");
  await bookingPage.createTeam("Test Team");
  await bookingPage.createTeamEventType("Test Collective Event Type", { isCollectiveType: true });
});

test.describe("Booking With MultiSelect Question and Each Other Question", async () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.describe("Booking With MultiSelect Question and Address Question", () => {
    test("MultiSelect required and Address required", async ({ bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.addQuestion("multiselect", "multiselect-test", "multiselect test", true);
      await bookingPage.addQuestion("address", "address-test", "address test", true, "address test");
      await bookingPage.updateEventType();
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Address question (both required)",
        secondQuestion: "address",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Address not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and Address question (only radio required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and checkbox group Question", () => {
    test("MultiSelect required and checkbox group required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and checkbox group question (both required)",
        secondQuestion: "checkbox",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and checkbox group not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and checkbox group question (only radio required)",
        secondQuestion: "checkbox",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and checkbox Question", () => {
    test("MultiSelect required and checkbox required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and checkbox question (both required)",
        secondQuestion: "boolean",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and checkbox not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and checkbox (only radio required)",
        secondQuestion: "boolean",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and Long text Question", () => {
    test("MultiSelect required and Long text required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("checkbox");
      await bookingPage.addQuestion("textarea", "textarea-test", "textarea test", true, "textarea test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Long Text question (both required)",
        secondQuestion: "textarea",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Long text not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
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
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Long Text question (only radio required)",
        secondQuestion: "textarea",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and Multi email Question", () => {
    test("MultiSelect required and Multi email required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
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
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Multi Email question (both required)",
        secondQuestion: "multiemail",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Multi email not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and Multi Email question (only radio required)",
        secondQuestion: "multiemail",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and Radio Question", () => {
    test("MultiSelect required and radio text required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("multiemail");
      await bookingPage.addQuestion("radio", "radio-test", "radio test", true);
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Radio question (both required)",
        secondQuestion: "radio",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Radio text not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and Radio question (only radio required)",
        secondQuestion: "radio",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and Number Question", () => {
    test("MultiSelect required and Number required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("radio");
      await bookingPage.addQuestion("number", "number-test", "number test", true, "number test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Number question (both required)",
        secondQuestion: "number",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Number not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and Number question (only radio required)",
        secondQuestion: "number",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and Phone Question", () => {
    test("MultiSelect required and Phone required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("number");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true, "phone test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Phone question (both required)",
        secondQuestion: "phone",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Phone not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and Phone question (only radio required)",
        secondQuestion: "phone",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and select Question", () => {
    test("MultiSelect required and select required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("phone");
      await bookingPage.addQuestion("select", "select-test", "select test", true, "select test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Select question (both required)",
        secondQuestion: "select",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and select not required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.editQuestion("select", { shouldBeRequired: false });
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Select question (only radio required)",
        secondQuestion: "select",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With MultiSelect Question and Short text question", () => {
    test("MultiSelect required and Short text required", async ({ page, bookingPage }) => {
      const shareText = (await localize("en"))("share_additional_notes");
      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("select");
      await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });
      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: shareText,
        question: "multiselect",
        fillText: "Test MultiSelect question and Text question (both required)",
        secondQuestion: "text",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("MultiSelect and Short text not required", async ({ page, bookingPage }) => {
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
        question: "multiselect",
        fillText: "Test MultiSelect question and Text question (only radio required)",
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
