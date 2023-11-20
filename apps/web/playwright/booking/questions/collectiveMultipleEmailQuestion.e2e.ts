import { login } from "../../fixtures/users";
import { test } from "../../lib/fixtures";
import { localize } from "../../lib/testUtils";

test.beforeAll(async ({ page, bookingPage }) => {
  await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
  await page.goto("/event-types");
  await bookingPage.createTeam("Test Team");
  await bookingPage.createTeamEventType("Test Collective Event Type", { isCollectiveType: true });
});

test.describe("Booking With Multiple Email Question and Each Other Question", async () => {
  const bookingOptions = { hasPlaceholder: true, isRequired: true };

  test.describe("Booking With Multiple Email Question and Address Question", () => {
    test("Multiple Email and Address required", async ({ bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await bookingPage.goToTab("event_advanced_tab_title");
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
        placeholderText: placeholder,
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

    test("Multiple Email required and Address not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Address question (only multiemail required)",
        secondQuestion: "address",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and phone Question", () => {
    const bookingOptions = { hasPlaceholder: false, isRequired: true };
    test("Multiple Email and multiemail group required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("address");
      await bookingPage.addQuestion("phone", "phone-test", "phone test", true);
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
        question: "multiemail",
        fillText: "Test Multiple Email question and phone question (both required)",
        secondQuestion: "phone",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email and phone not required", async ({ page, bookingPage }) => {
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
        fillText: "Test Multiple Email question and phone group question (only multiemail required)",
        secondQuestion: "phone",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and checkbox Question", () => {
    test("Multiple Email and checkbox required", async ({ page, bookingPage }) => {
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
        question: "checkbox",
        fillText: "Test Multiple Email question and checkbox question (both required)",
        secondQuestion: "boolean",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
    test("Multiple Email required and checkbox not required", async ({ page, bookingPage }) => {
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
  test.describe("Booking With Multiple Email Question and Long Question", () => {
    test("Multiple Email and long question required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and long question question (both required)",
        secondQuestion: "textarea",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
    test("Multiple Email required and long question not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and long question (only multiemail required)",
        secondQuestion: "textarea",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and Multi email Question", () => {
    const bookingOptions = { hasPlaceholder: true, isRequired: true };
    test("Multiple Email and Multi email required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Multi Email question (both required)",
        secondQuestion: "multiemail",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email required and Multi email not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Multi Email question (only multiemail required)",
        secondQuestion: "multiemail",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and multiselect Question", () => {
    test("Multiple Email and multiselect text required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Multi Multiple Email question (both required)",
        secondQuestion: "multiselect",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email required and multiselect text not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Multi Multiple Email question (only multiemail required)",
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
    test("Multiple Email and Number required", async ({ page, bookingPage }) => {
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

    test("Multiple Email required and Number not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Number question (only multiemail required)",
        secondQuestion: "number",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and Radio group Question", () => {
    test("Multiple Email and Radio group required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Radio question (both required)",
        secondQuestion: "radio",
        options: bookingOptions,
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });

    test("Multiple Email required and Radio group not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Radio question (only multiemail required)",
        secondQuestion: "radio",
        options: { ...bookingOptions, isRequired: false },
      });
      await bookingPage.rescheduleBooking(eventTypePage);
      await bookingPage.assertBookingRescheduled(eventTypePage);
      await bookingPage.cancelBooking(eventTypePage);
      await bookingPage.assertBookingCanceled(eventTypePage);
    });
  });

  test.describe("Booking With Multiple Email Question and select Question", () => {
    test("Multiple Email and select required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("radio");
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

    test("Multiple Email required and select not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Select question (only multiemail required)",
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
    test("Multiple Email and Short text required", async ({ page, bookingPage }) => {
      const placeholder = (await localize("en"))("share_additional_notes");

      await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);

      await page.goto("/event-types");
      await bookingPage.goToEventType("Test Collective Event Type");
      await bookingPage.goToTab("event_advanced_tab_title");
      await bookingPage.removeQuestion("multiemail");
      await bookingPage.addQuestion("text", "text-test", "text test", true, "text test");
      await bookingPage.updateEventType({ shouldCheck: true, name: "Test Collective Event Type" });

      const eventTypePage = await bookingPage.previewEventType();
      await bookingPage.selectTimeSlot(eventTypePage);
      await bookingPage.fillAndConfirmBooking({
        eventTypePage,
        placeholderText: placeholder,
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

    test("Multiple Email required and Short text not required", async ({ page, bookingPage }) => {
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
        question: "multiemail",
        fillText: "Test Multiple Email question and Text question (only multiemail required)",
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
