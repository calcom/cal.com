import { expect, type Page } from "@playwright/test";

import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";

import { loginUser, rescheduleAndCancel } from "./bookingUtils";

const EMAIL = "test@test.com";
const PHONE = "+55 (32) 9832847";
const scheduleSuccessfullyText = "This meeting is scheduled";

type BookingOptions = {
  isReschedule?: boolean;
  isAllRequired?: boolean;
};

// Fill a form field based on the question type
const fillFormField = async (eventTypePage: Page, question: string) => {
  switch (question) {
    case "email":
      await eventTypePage.getByPlaceholder("Email").click();
      await eventTypePage.getByPlaceholder("Email").fill(EMAIL);
      break;
    case "phone":
      await eventTypePage.getByPlaceholder("Phone test").click();
      await eventTypePage.getByPlaceholder("Phone test").fill(PHONE);
      break;
    case "address":
      await eventTypePage.getByPlaceholder("Address test").click();
      await eventTypePage.getByPlaceholder("Address test").fill("123 Main St, City, Country");
      break;
    case "textarea":
      await eventTypePage.getByPlaceholder("Textarea test").click();
      await eventTypePage.getByPlaceholder("Textarea test").fill("This is a sample text for textarea.");
      break;
    case "select":
      await eventTypePage.locator("form svg").last().click();
      await eventTypePage.getByTestId("select-option-Option 1").click();
      break;
    case "multiselect":
      await eventTypePage.locator("form svg").nth(4).click();
      await eventTypePage.getByTestId("select-option-Option 1").click();
      break;
    case "number":
      await eventTypePage.getByLabel("number test").click();
      await eventTypePage.getByLabel("number test").fill("123");
      break;
    case "radio":
      await eventTypePage.getByRole("radiogroup").getByText("Option 1").check();
      break;
    case "text":
      await eventTypePage.getByPlaceholder("Text test").click();
      await eventTypePage.getByPlaceholder("Text test").fill("Sample text");
      break;
    case "checkbox":
      await eventTypePage.getByLabel("Option 1").first().check();
      await eventTypePage.getByLabel("Option 2").first().check();
      break;
    case "boolean":
      await eventTypePage.getByLabel(`${question} test`).check();
      break;
    case "multiemail":
      await eventTypePage.getByRole("button", { name: "multiemail test" }).click();
      await eventTypePage.getByPlaceholder("multiemail test").fill(EMAIL);
      break;
  }
};

// Fill all required questions in the booking page
export const fillAllQuestionsBooking = async (
  eventTypePage: Page,
  questions: string[],
  options: BookingOptions
) => {
  const confirmButton = options.isReschedule ? "confirm-reschedule-button" : "confirm-book-button";

  if (options.isAllRequired) {
    for (const question of questions) {
      await fillFormField(eventTypePage, question);
    }
  }

  await eventTypePage.getByTestId(confirmButton).click();
  const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
  await scheduleSuccessfullyPage.waitFor({ state: "visible" });
  await expect(scheduleSuccessfullyPage).toBeVisible();
};

export const scheduleAllQuestionsBooking = async (
  bookingPage: Page,
  questions: string[],
  users: Fixtures["users"],
  options: BookingOptions
) => {
  // Logs in a test user and navigates to the event types page.
  await loginUser(bookingPage, users);

  // Go to event type settings
  await bookingPage.getByRole("link", { name: "30 min" }).click();

  // Go to advanced tab
  await bookingPage.getByTestId("vertical-tab-event_advanced_tab_title").click();

  // Add multiple fields based on the questions array
  for (const question of questions) {
    // Check if all questions have isRequired set to true
    if (options.isAllRequired) {
      await bookingPage.getByTestId("add-field").click();
      await bookingPage.locator("#test-field-type > .bg-default > div > div:nth-child(2)").first().click();
      await bookingPage.getByTestId(`select-option-${question}`).click();
      await bookingPage.getByLabel("Identifier").dblclick();
      await bookingPage.getByLabel("Identifier").fill(`${question}-test`);
      await bookingPage.getByLabel("Label").click();
      await bookingPage.getByLabel("Label").fill(`${question} test`);
      if (
        question !== "number" &&
        question !== "multiemails" &&
        question !== "select" &&
        question !== "checkbox" &&
        question !== "boolean" &&
        question !== "multiselect" &&
        question !== "radio"
      ) {
        await bookingPage.getByLabel("Placeholder").dblclick();
        await bookingPage.getByLabel("Placeholder").fill(`${question} test`);
      }
      await bookingPage.getByTestId("field-add-save").click();
      await expect(bookingPage.getByTestId(`field-${question}-test`)).toBeVisible();
    }
  }

  await bookingPage.getByTestId("update-eventtype").click();

  // Go to booking page
  const eventtypePromise = bookingPage.waitForEvent("popup");
  await bookingPage.getByTestId("preview-button").click();
  const eventTypePage = await eventtypePromise;

  // Select the first available time
  await eventTypePage.getByTestId("time").first().click();

  fillAllQuestionsBooking(eventTypePage, questions, options);

  // Go to final steps
  await rescheduleAndCancel(eventTypePage);
};
