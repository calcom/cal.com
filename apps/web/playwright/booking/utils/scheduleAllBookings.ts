import { expect, type Page } from "@playwright/test";

import {
  goToEventType,
  goToTab,
  addQuestion,
  updateEventType,
  previewEventType,
  selectFirstAvailableTime,
  rescheduleAndCancel,
} from "../../fixtures/regularBookings";

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
  options: BookingOptions
) => {
  // Go to event type settings
  await goToEventType(bookingPage, "30 min");

  // Go to advanced tab
  await goToTab(bookingPage, "event_advanced_tab_title");

  // Add multiple fields based on the questions array
  for (const question of questions) {
    // Check if all questions have isRequired set to true
    if (options.isAllRequired) {
      if (
        question !== "number" &&
        question !== "multiemails" &&
        question !== "select" &&
        question !== "checkbox" &&
        question !== "boolean" &&
        question !== "multiselect" &&
        question !== "radio"
      ) {
        await addQuestion(bookingPage, question, `${question}-test`, `${question} test`, `${question} test`);
      } else {
        await addQuestion(bookingPage, question, `${question}-test`, `${question} test`);
      }
      await expect(bookingPage.getByTestId(`field-${question}-test`)).toBeVisible();
    }
  }

  await updateEventType(bookingPage);

  // Go to booking page
  const eventTypePage = await previewEventType(bookingPage);

  // Select the first available time
  await selectFirstAvailableTime(eventTypePage);

  fillAllQuestionsBooking(eventTypePage, questions, options);

  // Go to final steps
  await rescheduleAndCancel(eventTypePage);
};
