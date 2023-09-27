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

export const loginUser = async (page: Page, users: Fixtures["users"]) => {
  const pro = await users.create({ name: "testuser" });
  await pro.apiLogin();
  await page.goto("/event-types");
};

const fillQuestion = async (
  eventTypePage: Page,
  questionType: string,
  questionText: string,
  options: BookingOptions
) => {
  const questionActions: QuestionActions = {
    phone: async () => {
      await eventTypePage.getByPlaceholder(`${questionText} test`).clear();
      await eventTypePage.getByPlaceholder(`${questionText} test`).fill(PHONE);
    },
    multiemail: async () => {
      await eventTypePage.getByRole("button", { name: `${questionText} test` }).click();
      await eventTypePage.getByPlaceholder(`${questionText} test`).fill(EMAIL);
      await eventTypePage.getByTestId("add-another-guest").last().click();
      await eventTypePage.getByPlaceholder(`${questionText} test`).last().fill(EMAIL2);
    },
    checkbox: async () => {
      await eventTypePage.getByLabel("Option 1").click();
      await eventTypePage.getByLabel("Option 2").click();
    },
    multiselect: async () => {
      await eventTypePage.locator("form svg").last().click();
      await eventTypePage.getByTestId("select-option-Option 1").click();
    },
    boolean: async () => {
      await eventTypePage.getByLabel(`${questionText} test`).check();
    },
    radio: async () => {
      await eventTypePage.locator('[id="radio-test\\.option\\.0\\.radio"]').click();
    },
    select: async () => {
      await eventTypePage.locator("form svg").last().click();
      await eventTypePage.getByTestId("select-option-Option 1").click();
    },
    number: async () => {
      await eventTypePage.getByPlaceholder(`${questionText} test`).click();
      await eventTypePage.getByPlaceholder(`${questionText} test`).fill("123");
    },
    address: async () => {
      await eventTypePage.getByPlaceholder(`${questionText} test`).click();
      await eventTypePage.getByPlaceholder(`${questionText} test`).fill("address test");
    },
    textarea: async () => {
      await eventTypePage.getByPlaceholder(`${questionText} test`).click();
      await eventTypePage.getByPlaceholder(`${questionText} test`).fill("textarea test");
    },
    text: async () => {
      await eventTypePage.getByPlaceholder(`${questionText} test`).click();
      await eventTypePage.getByPlaceholder(`${questionText} test`).fill("text test");
    },
  };

  if (options.isRequired || questionType !== "secondQuestion") {
    if (questionActions[questionType]) {
      await questionActions[questionType]();
    }
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

  // Fill the first question
  await fillQuestion(eventTypePage, question, question, options);

  // Fill the second question
  await fillQuestion(eventTypePage, secondQuestion, secondQuestion, options);

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
  await bookingPage.getByLabel("Placeholder").click();
  await bookingPage.getByLabel("Placeholder").fill(`${question} test`);
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
const rescheduleAndCancel = async (eventTypePage: Page) => {
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
