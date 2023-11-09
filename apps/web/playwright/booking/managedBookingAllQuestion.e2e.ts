/* eslint-disable playwright/no-conditional-in-test */
import { expect } from "@playwright/test";

import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Booking With All Questions", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.createTeam("Test Team");
    await bookingPage.goToTab("Back");
    await bookingPage.createManagedEventType("Test Managed Event Type");
    await bookingPage.goToEventType("Event Types");
    await expect(
      page.getByRole("link", {
        name: "Test Managed Event Type",
      })
    ).toBeVisible();
    await bookingPage.goToEventType("Test Managed Event Type");
    await bookingPage.goToTab("event_advanced_tab_title");
  });

  const bookingOptions = { isAllRequired: true };

  test("Selecting and filling all questions as required", async ({ bookingPage }) => {
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
    for (const question of allQuestions) {
      if (bookingOptions.isAllRequired) {
        if (
          question !== "number" &&
          question !== "multiemail" &&
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
    }

    await bookingPage.updateEventType();
  });

  test("Selecting and filling all questions as optional", async ({ bookingPage }) => {
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
    for (const question of allQuestions) {
      if (bookingOptions.isAllRequired) {
        if (
          question !== "number" &&
          question !== "multiemail" &&
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
    }

    await bookingPage.updateEventType();
  });
});
