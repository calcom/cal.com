import { expect, type Page } from "@playwright/test";

import dayjs from "@calcom/dayjs";

import type { createUsersFixture } from "./users";

const reschedulePlaceholderText = "Let others know why you need to reschedule";
export const scheduleSuccessfullyText = "This meeting is scheduled";

const EMAIL = "test@test.com";
const EMAIL2 = "test2@test.com";
const PHONE = "+55 (32) 983289947";

type BookingOptions = {
  hasPlaceholder?: boolean;
  isReschedule?: boolean;
  isRequired?: boolean;
  isAllRequired?: boolean;
  isMultiSelect?: boolean;
};

interface QuestionActions {
  [key: string]: () => Promise<void>;
}

type customLocators = {
  shouldChangeSelectLocator: boolean;
  shouldUseLastRadioGroupLocator: boolean;
  shouldUseFirstRadioGroupLocator: boolean;
  shouldChangeMultiSelectLocator: boolean;
};

type fillAndConfirmBookingParams = {
  eventTypePage: Page;
  placeholderText: string;
  question: string;
  fillText: string;
  secondQuestion: string;
  options: BookingOptions;
};

type UserFixture = ReturnType<typeof createUsersFixture>;

function isLastDayOfMonth(): boolean {
  const today = dayjs();
  const endOfMonth = today.endOf("month");
  return today.isSame(endOfMonth, "day");
}

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
        await eventTypePage.getByLabel("multi-select-dropdown").click();
        await eventTypePage.getByTestId("select-option-Option 1").click();
      } else {
        await eventTypePage.getByLabel("multi-select-dropdown").last().click();
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
        await eventTypePage.getByLabel("select-dropdown").first().click();
        await eventTypePage.getByTestId("select-option-Option 1").click();
      } else {
        await eventTypePage.getByLabel("select-dropdown").last().click();
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

const fillAllQuestions = async (eventTypePage: Page, questions: string[], options: BookingOptions) => {
  if (options.isAllRequired) {
    for (const question of questions) {
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
          await eventTypePage.getByLabel("select-dropdown").last().click();
          await eventTypePage.getByTestId("select-option-Option 1").click();
          break;
        case "multiselect":
          // select-dropdown
          await eventTypePage.getByLabel("multi-select-dropdown").click();
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
    }
  }
};

export async function loginUser(users: UserFixture) {
  const pro = await users.create({ name: "testuser" });
  await pro.apiLogin();
}

const goToNextMonthIfNoAvailabilities = async (eventTypePage: Page) => {
  try {
    if (isLastDayOfMonth()) {
      await eventTypePage.getByTestId("view_next_month").waitFor({ timeout: 6000 });
      await eventTypePage.getByTestId("view_next_month").click();
    }
  } catch (err) {
    console.info("No need to click on view next month button");
  }
};

export function createBookingPageFixture(page: Page) {
  return {
    goToEventType: async (eventType: string) => {
      await page.getByRole("link", { name: eventType }).click();
    },
    goToTab: async (tabName: string) => {
      await page.getByTestId(`vertical-tab-${tabName}`).click();
    },
    addQuestion: async (
      questionType: string,
      identifier: string,
      label: string,
      isRequired: boolean,
      placeholder?: string
    ) => {
      await page.getByTestId("add-field").click();
      await page.getByTestId("test-field-type").click();
      await page.getByTestId(`select-option-${questionType}`).click();
      await page.getByLabel("Identifier").dblclick();
      await page.getByLabel("Identifier").fill(identifier);
      await page.getByLabel("Label").click();
      await page.getByLabel("Label").fill(label);
      if (placeholder) {
        await page.getByLabel("Placeholder").click();
        await page.getByLabel("Placeholder").fill(placeholder);
      }
      if (!isRequired) {
        await page.getByRole("radio", { name: "No" }).click();
      }
      await page.getByTestId("field-add-save").click();
    },
    updateEventType: async () => {
      await page.getByTestId("update-eventtype").click();
    },
    previewEventType: async () => {
      const eventtypePromise = page.waitForEvent("popup");
      await page.getByTestId("preview-button").click();
      return eventtypePromise;
    },
    selectTimeSlot: async (eventTypePage: Page) => {
      await goToNextMonthIfNoAvailabilities(eventTypePage);
      await eventTypePage.getByTestId("time").first().click();
    },
    clickReschedule: async () => {
      await page.getByText("Reschedule").click();
    },

    selectFirstAvailableTime: async () => {
      await page.getByTestId("time").first().click();
    },

    fillRescheduleReasonAndConfirm: async () => {
      await page.getByPlaceholder(reschedulePlaceholderText).click();
      await page.getByPlaceholder(reschedulePlaceholderText).fill("Test reschedule");
      await page.getByTestId("confirm-reschedule-button").click();
    },

    cancelBookingWithReason: async (page: Page) => {
      await page.getByTestId("cancel").click();
      await page.getByTestId("cancel_reason").fill("Test cancel");
      await page.getByTestId("confirm_cancel").click();
    },
    assertBookingCanceled: async (page: Page) => {
      await expect(page.getByTestId("cancelled-headline")).toBeVisible();
    },

    rescheduleBooking: async (eventTypePage: Page) => {
      await goToNextMonthIfNoAvailabilities(eventTypePage);
      await eventTypePage.getByText("Reschedule").click();
      while (await eventTypePage.getByRole("button", { name: "View next" }).isVisible()) {
        await eventTypePage.getByRole("button", { name: "View next" }).click();
      }
      await eventTypePage.getByTestId("time").first().click();
      await eventTypePage.getByPlaceholder(reschedulePlaceholderText).click();
      await eventTypePage.getByPlaceholder(reschedulePlaceholderText).fill("Test reschedule");
      await eventTypePage.getByTestId("confirm-reschedule-button").click();
      await eventTypePage.waitForTimeout(400);
      if (
        await eventTypePage.getByRole("heading", { name: "Could not reschedule the meeting." }).isVisible()
      ) {
        await eventTypePage.getByTestId("back").click();
        await eventTypePage.getByTestId("time").last().click();
        await eventTypePage.getByTestId("confirm-reschedule-button").click();
      }
    },

    assertBookingRescheduled: async (page: Page) => {
      await expect(page.getByText(scheduleSuccessfullyText)).toBeVisible();
    },

    cancelBooking: async (eventTypePage: Page) => {
      await eventTypePage.getByTestId("cancel").click();
      await eventTypePage.getByTestId("cancel_reason").fill("Test cancel");
      await eventTypePage.getByTestId("confirm_cancel").click();
      await expect(eventTypePage.getByTestId("cancelled-headline")).toBeVisible();
    },

    fillAndConfirmBooking: async ({
      eventTypePage,
      placeholderText,
      question,
      fillText,
      secondQuestion,
      options,
    }: fillAndConfirmBookingParams) => {
      const confirmButton = options.isReschedule ? "confirm-reschedule-button" : "confirm-book-button";

      await expect(eventTypePage.getByText(`${secondQuestion} test`).first()).toBeVisible();
      await eventTypePage.getByPlaceholder(placeholderText).fill(fillText);

      // Change the selector for specifics cases related to select question
      const shouldChangeSelectLocator = (question: string, secondQuestion: string): boolean =>
        question === "select" && ["multiemail", "multiselect", "address"].includes(secondQuestion);

      const shouldUseLastRadioGroupLocator = (question: string, secondQuestion: string): boolean =>
        question === "radio" && secondQuestion === "checkbox";

      const shouldUseFirstRadioGroupLocator = (question: string, secondQuestion: string): boolean =>
        question === "checkbox" && secondQuestion === "radio";

      const shouldChangeMultiSelectLocator = (question: string, secondQuestion: string): boolean =>
        question === "multiselect" &&
        ["address", "checkbox", "multiemail", "select"].includes(secondQuestion);

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
      await eventTypePage.waitForTimeout(400);
      if (await eventTypePage.getByRole("heading", { name: "Could not book the meeting." }).isVisible()) {
        await eventTypePage.getByTestId("back").click();
        await eventTypePage.getByTestId("time").last().click();
        await fillQuestion(eventTypePage, question, customLocators);
        options.isRequired && (await fillQuestion(eventTypePage, secondQuestion, customLocators));
        await eventTypePage.getByTestId(confirmButton).click();
      }
      const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
      await scheduleSuccessfullyPage.waitFor({ state: "visible" });
      await expect(scheduleSuccessfullyPage).toBeVisible();
    },
    checkField: async (question: string) => {
      await expect(page.getByTestId(`field-${question}-test`)).toBeVisible();
    },
    fillAllQuestions: async (eventTypePage: Page, questions: string[], options: BookingOptions) => {
      const confirmButton = options.isReschedule ? "confirm-reschedule-button" : "confirm-book-button";
      await fillAllQuestions(eventTypePage, questions, options);
      await eventTypePage.getByTestId(confirmButton).click();
      await eventTypePage.waitForTimeout(400);
      if (await eventTypePage.getByRole("heading", { name: "Could not book the meeting." }).isVisible()) {
        await eventTypePage.getByTestId("back").click();
        await eventTypePage.getByTestId("time").last().click();
        await fillAllQuestions(eventTypePage, questions, options);
        await eventTypePage.getByTestId(confirmButton).click();
      }
      const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
      await scheduleSuccessfullyPage.waitFor({ state: "visible" });
      await expect(scheduleSuccessfullyPage).toBeVisible();
    },
  };
}
