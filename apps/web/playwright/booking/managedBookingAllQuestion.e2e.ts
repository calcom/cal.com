/* eslint-disable playwright/no-conditional-in-test */
import { test } from "../lib/fixtures";

test.describe("Managed Booking With All Questions", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    const teamEventTitle = "testevent";
    const userFixture = await users.create({ name: "testuser" }, { hasTeam: true, teamEventTitle });
    await userFixture.apiLogin();
    await page.goto("/event-types");
    await bookingPage.createTeamEventType("Test Managed Event Type", { isManagedType: true });
    await bookingPage.goToTab("event_advanced_tab_title");
  });

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

  test("Selecting and filling all questions as required (Managed Event)", async ({ bookingPage }) => {
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
  });

  test("Selecting and filling all questions as optional (Managed Event)", async ({ bookingPage }) => {
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
  });
});
