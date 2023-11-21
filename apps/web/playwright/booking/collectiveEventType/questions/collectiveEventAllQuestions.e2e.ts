/* eslint-disable playwright/no-conditional-in-test */
import { loginUser } from "../../../fixtures/regularBookings";
import { test } from "../../../lib/fixtures";

test.describe("Collective Booking With All Questions", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.createTeam("Test Team");
    await bookingPage.createTeamEventType("Test Collective Event Type", { isCollectiveType: true });
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  const bookingOptions = { isAllRequired: true };
  const allQuestions = [
    "phone",
    "address",
    "checkbox",
    "boolean",
    "textarea",
    "multiemail",
    "multiselect",
    "number",
    "radio",
    "select",
    "text",
  ];

  test("Selecting and filling all questions as required (Collective Event)", async ({ bookingPage }) => {
    for (const question of allQuestions) {
      if (
        question !== "number" &&
        question !== "select" &&
        question !== "checkbox" &&
        question !== "boolean" &&
        question !== "multiselect" &&
        question !== "radio"
      ) {
        await bookingPage.addQuestion(
          question,
          `${question}-test`,
          `${question} test`,
          true,
          `${question} test`
        );
      } else {
        await bookingPage.addQuestion(question, `${question}-test`, `${question} test`, true);
      }
      await bookingPage.checkField(question);
    }

    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAllQuestions(eventTypePage, allQuestions, bookingOptions);
    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });

  test("Selecting and filling all questions as optional (Collective Event)", async ({ bookingPage }) => {
    for (const question of allQuestions) {
      if (
        question !== "number" &&
        question !== "select" &&
        question !== "checkbox" &&
        question !== "boolean" &&
        question !== "multiselect" &&
        question !== "radio"
      ) {
        await bookingPage.addQuestion(
          question,
          `${question}-test`,
          `${question} test`,
          false,
          `${question} test`
        );
      } else {
        await bookingPage.addQuestion(question, `${question}-test`, `${question} test`, false);
      }
      await bookingPage.checkField(question, { isOptional: true });
    }

    await bookingPage.updateEventType();
    const eventTypePage = await bookingPage.previewEventType();
    await bookingPage.selectTimeSlot(eventTypePage);
    await bookingPage.fillAllQuestions(eventTypePage, allQuestions, {
      ...bookingOptions,
      isAllRequired: false,
    });

    await bookingPage.rescheduleBooking(eventTypePage);
    await bookingPage.assertBookingRescheduled(eventTypePage);
    await bookingPage.cancelBooking(eventTypePage);
    await bookingPage.assertBookingCanceled(eventTypePage);
  });
});
