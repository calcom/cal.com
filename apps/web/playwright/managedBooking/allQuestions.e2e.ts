/* eslint-disable playwright/no-conditional-in-test */
import { expect } from "@playwright/test";

import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

test.describe("Create a Team, a Managed Event Type and add all questions", () => {
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

  test.afterEach(async ({ bookingPage }) => {
    await bookingPage.goToEventType("Event Types");
    await bookingPage.goToEventType("Test Managed Event Type");
    await bookingPage.removeManagedEventType();
    await bookingPage.assertManagedEventTypeDeleted();
    await bookingPage.deleteTeam();
    await bookingPage.assertTeamDeleted();
  });

  test("All Questions as Required", async ({ bookingPage }) => {
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

    await bookingPage.updateEventType({ shouldCheck: true });
  });

  test("All Questions as Optional", async ({ bookingPage }) => {
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

    await bookingPage.updateEventType({ shouldCheck: true });
  });
});
