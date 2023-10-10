import { expect, type Page } from "@playwright/test";

import {
  addQuestion,
  goToEventType,
  goToTab,
  previewEventType,
  selectTimeSlot,
  updateEventType,
  scheduleSuccessfullyText,
  rescheduleAndCancel,
} from "../../fixtures/regularBookings";

const EMAIL = "test@test.com";
const EMAIL2 = "test2@test.com";
const PHONE = "+55 (32) 983289947";

interface QuestionActions {
  [key: string]: () => Promise<void>;
}

type BookingOptions = {
  hasPlaceholder?: boolean;
  isReschedule?: boolean;
  isRequired?: boolean;
};

type customLocators = {
  shouldChangeSelectLocator: boolean;
  shouldUseLastRadioGroupLocator: boolean;
  shouldUseFirstRadioGroupLocator: boolean;
  shouldChangeMultiSelectLocator: boolean;
};

const fillQuestion = async (eventTypePage: Page, questionType: string, customLocators: customLocators) => {
  const questionActions: QuestionActions = {
    phone: async () => {
      await eventTypePage.locator('input[name="phone-test"]').clear();
      await eventTypePage.locator('input[name="phone-test"]').fill(PHONE);
    },
    multiemail: async () => {
      await eventTypePage.getByRole("button", { name: `${questionType} test` }).click();
      await eventTypePage.getByPlaceholder(`${questionType} test`).fill(EMAIL);
      await eventTypePage.getByTestId("add-another-guest").last().click();
      await eventTypePage.getByPlaceholder(`${questionType} test`).last().fill(EMAIL2);
    },
    checkbox: async () => {
      if (customLocators.shouldUseLastRadioGroupLocator || customLocators.shouldChangeMultiSelectLocator) {
        await eventTypePage.getByLabel("Option 1").last().click();
        await eventTypePage.getByLabel("Option 2").last().click();
      } else if (customLocators.shouldUseFirstRadioGroupLocator) {
        await eventTypePage.getByLabel("Option 1").first().click();
        await eventTypePage.getByLabel("Option 2").first().click();
      } else {
        await eventTypePage.getByLabel("Option 1").click();
        await eventTypePage.getByLabel("Option 2").click();
      }
    },
    multiselect: async () => {
      if (customLocators.shouldChangeMultiSelectLocator) {
        await eventTypePage.locator("form svg").nth(1).click();
        await eventTypePage.getByTestId("select-option-Option 1").click();
      } else {
        await eventTypePage.locator("form svg").last().click();
        await eventTypePage.getByTestId("select-option-Option 1").click();
      }
    },
    boolean: async () => {
      await eventTypePage.getByLabel(`${questionType} test`).check();
    },
    radio: async () => {
      await eventTypePage.locator('[id="radio-test\\.option\\.0\\.radio"]').click();
    },
    select: async () => {
      if (customLocators.shouldChangeSelectLocator) {
        await eventTypePage.locator("form svg").nth(1).click();
        await eventTypePage.getByTestId("select-option-Option 1").click();
      } else {
        await eventTypePage.locator("form svg").last().click();
        await eventTypePage.getByTestId("select-option-Option 1").click();
      }
    },
    number: async () => {
      await eventTypePage.getByPlaceholder(`${questionType} test`).click();
      await eventTypePage.getByPlaceholder(`${questionType} test`).fill("123");
    },
    address: async () => {
      await eventTypePage.getByPlaceholder(`${questionType} test`).click();
      await eventTypePage.getByPlaceholder(`${questionType} test`).fill("address test");
    },
    textarea: async () => {
      await eventTypePage.getByPlaceholder(`${questionType} test`).click();
      await eventTypePage.getByPlaceholder(`${questionType} test`).fill("textarea test");
    },
    text: async () => {
      await eventTypePage.getByPlaceholder(`${questionType} test`).click();
      await eventTypePage.getByPlaceholder(`${questionType} test`).fill("text test");
    },
  };

  if (questionActions[questionType]) {
    await questionActions[questionType]();
  }
};

export const fillAndConfirmBooking = async (
  eventTypePage: Page,
  placeholderText: string,
  question: string,
  fillText: string,
  secondQuestion: string,
  options: BookingOptions
) => {
  const confirmButton = options.isReschedule ? "confirm-reschedule-button" : "confirm-book-button";

  await expect(eventTypePage.getByText(`${secondQuestion} test`).first()).toBeVisible();
  await eventTypePage.getByPlaceholder(placeholderText).fill(fillText);

  // Change the selector for specifics cases related to select question
  const shouldChangeSelectLocator = (question: string, secondQuestion: string): boolean =>
    question === "select" && ["multiemail", "multiselect"].includes(secondQuestion);

  const shouldUseLastRadioGroupLocator = (question: string, secondQuestion: string): boolean =>
    question === "radio" && secondQuestion === "checkbox";

  const shouldUseFirstRadioGroupLocator = (question: string, secondQuestion: string): boolean =>
    question === "checkbox" && secondQuestion === "radio";

  const shouldChangeMultiSelectLocator = (question: string, secondQuestion: string): boolean =>
    question === "multiselect" && ["address", "checkbox", "multiemail", "select"].includes(secondQuestion);

  const customLocators = {
    shouldChangeSelectLocator: shouldChangeSelectLocator(question, secondQuestion),
    shouldUseLastRadioGroupLocator: shouldUseLastRadioGroupLocator(question, secondQuestion),
    shouldUseFirstRadioGroupLocator: shouldUseFirstRadioGroupLocator(question, secondQuestion),
    shouldChangeMultiSelectLocator: shouldChangeMultiSelectLocator(question, secondQuestion),
  };

  // Fill the first question
  await fillQuestion(eventTypePage, question, customLocators);

  // Fill the second question if is required
  options.isRequired && (await fillQuestion(eventTypePage, secondQuestion, customLocators));

  await eventTypePage.getByTestId(confirmButton).click();
  const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
  await scheduleSuccessfullyPage.waitFor({ state: "visible" });
  await expect(scheduleSuccessfullyPage).toBeVisible();
};

export const setupEventTypeAndExecuteBooking = async (
  bookingPage: Page,
  question: string,
  secondQuestion: string,
  message: string,
  options: BookingOptions
) => {
  const firstQuestionHasPlaceholder = [
    "address",
    "textarea",
    "multiemail",
    "number",
    "text",
    "phone",
  ].includes(question);

  // Go to event type settings
  await goToEventType(bookingPage, "30 min");

  // Go to advanced tab
  await goToTab(bookingPage, "event_advanced_tab_title");

  // Add first and second question and fill both
  await addQuestion(
    bookingPage,
    question,
    `${question}-test`,
    `${question} test`,
    firstQuestionHasPlaceholder ? `${question} test` : undefined,
    options.isRequired
  );
  await addQuestion(
    bookingPage,
    secondQuestion,
    `${secondQuestion}-test`,
    `${secondQuestion} test`,
    options.hasPlaceholder ? `${secondQuestion} test` : undefined,
    options.isRequired
  );

  await expect(bookingPage.getByTestId(`field-${question}-test`)).toBeVisible();
  await expect(bookingPage.getByTestId(`field-${secondQuestion}-test`)).toBeVisible();

  // Update the event type
  await updateEventType(bookingPage);

  // Go to booking page
  const eventTypePage = await previewEventType(bookingPage);

  await selectTimeSlot(eventTypePage);

  await fillAndConfirmBooking(
    eventTypePage,
    "Please share anything that will help prepare for our meeting.",
    question,
    message,
    secondQuestion,
    options
  );

  await rescheduleAndCancel(eventTypePage);
};
