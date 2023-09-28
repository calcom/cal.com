import { expect, type Page } from "@playwright/test";

import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";

const EMAIL = "test@test.com";
const EMAIL2 = "test2@test.com";
const PHONE = "+55 (32) 983289947";
const scheduleSuccessfullyText = "This meeting is scheduled";
const reschedulePlaceholderText = "Let others know why you need to reschedule";

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

export const loginUser = async (page: Page, users: Fixtures["users"]) => {
  const pro = await users.create({ name: "testuser" });
  await pro.apiLogin();
  await page.goto("/event-types");
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

export const initialCommonSteps = async (
  bookingPage: Page,
  question: string,
  users: Fixtures["users"],
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

  //Logs in a test user and navigates to the event types page.
  loginUser(bookingPage, users);

  // Go to event type settings
  await bookingPage.getByRole("link", { name: "30 min" }).click();

  // Go to advanced tab
  await bookingPage.getByTestId("vertical-tab-event_advanced_tab_title").click();

  // Add first and second question and fill both
  await bookingPage.getByTestId("add-field").click();
  await bookingPage.locator("#test-field-type > .bg-default > div > div:nth-child(2)").first().click();
  await bookingPage.getByTestId(`select-option-${question}`).click();
  await bookingPage.getByLabel("Identifier").dblclick();
  await bookingPage.getByLabel("Identifier").fill(`${question}-test`);
  await bookingPage.getByLabel("Label").click();
  await bookingPage.getByLabel("Label").fill(`${question} test`);

  // Fill the placeholder if the question has one
  if (firstQuestionHasPlaceholder) {
    await bookingPage.getByLabel("Placeholder").click();
    await bookingPage.getByLabel("Placeholder").fill(`${question} test`);
  }
  await bookingPage.getByTestId("field-add-save").click();
  await bookingPage.getByTestId("add-field").click();
  await bookingPage.locator("#test-field-type > .bg-default > div > div:nth-child(2)").first().click();
  await bookingPage.getByTestId(`select-option-${secondQuestion}`).click();
  await bookingPage.getByLabel("Identifier").dblclick();
  await bookingPage.getByLabel("Identifier").fill(`${secondQuestion}-test`);
  await bookingPage.getByLabel("Label").click();
  await bookingPage.getByLabel("Label").fill(`${secondQuestion} test`);
  if (options.hasPlaceholder) {
    await bookingPage.getByLabel("Placeholder").dblclick();
    await bookingPage.getByLabel("Placeholder").fill(`${secondQuestion} test`);
  }
  if (!options.isRequired) {
    await bookingPage.getByRole("radio", { name: "No" }).click();
  }
  await bookingPage.getByTestId("field-add-save").click();
  await expect(bookingPage.getByTestId(`field-${question}-test`)).toBeVisible();
  await expect(bookingPage.getByTestId(`field-${secondQuestion}-test`)).toBeVisible();
  await bookingPage.getByTestId("update-eventtype").click();

  // Go to booking page
  const eventtypePromise = bookingPage.waitForEvent("popup");
  await bookingPage.getByTestId("preview-button").click();
  const eventTypePage = await eventtypePromise;

  // Select the first available time
  await eventTypePage.getByTestId("time").first().click();
  fillAndConfirmBooking(
    eventTypePage,
    "Please share anything that will help prepare for our meeting.",
    question,
    message,
    secondQuestion,
    options
  );

  // Go to final steps
  await rescheduleAndCancel(eventTypePage);
};
export const rescheduleAndCancel = async (eventTypePage: Page) => {
  await eventTypePage.getByText("Reschedule").click();
  await eventTypePage.getByTestId("time").first().click();
  await eventTypePage.getByPlaceholder(reschedulePlaceholderText).click();
  await eventTypePage.getByPlaceholder(reschedulePlaceholderText).fill("Test reschedule");
  await eventTypePage.getByTestId("confirm-reschedule-button").click();

  // Check if the rescheduled page is visible
  await expect(eventTypePage.getByText(scheduleSuccessfullyText)).toBeVisible();
  await eventTypePage.getByTestId("cancel").click();
  await eventTypePage.getByTestId("cancel_reason").fill("Test cancel");
  await eventTypePage.getByTestId("confirm_cancel").click();

  // Check if the cancelled page is visible
  await expect(eventTypePage.getByTestId("cancelled-headline")).toBeVisible();
};
