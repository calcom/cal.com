import { expect, type Page } from "@playwright/test";

import dayjs from "@calcom/dayjs";

import { localize } from "../lib/testUtils";
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
    goToEventTypesPage: async () => {
      await page.goto("/event-types");
    },
    addQuestion: async (
      questionType: string,
      identifier: string,
      label: string,
      isRequired: boolean,
      placeholder?: string
    ) => {
      await page.getByTestId("add-field").click();
      await page.locator("#test-field-type > .bg-default > div > div:nth-child(2)").first().click();
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
    checkAvailabilityTab: async () => {
      const editAvailability = (await localize("en"))("edit_availability");

      // verify if the icon is rendered
      await expect(page.locator("span").filter({ hasText: "Europe/London" }).locator("svg")).toBeVisible();
      await expect(page.getByText("Europe/London")).toBeVisible();
      await page.getByRole("link", { name: editAvailability }).click();
    },
    goToAvailabilityPage: async () => {
      const workingHours = (await localize("en"))("default_schedule_name");

      await page.goto("/availability");
      await page
        .getByTestId("schedules")
        .locator("div")
        .filter({
          hasText: workingHours,
        })
        .first()
        .click();
    },
    checkAvailabilityPage: async () => {
      const sunday = (await localize("en"))("sunday");
      const monday = (await localize("en"))("monday");
      const wednesday = (await localize("en"))("wednesday");
      const saturday = (await localize("en"))("saturday");
      const save = (await localize("en"))("save");

      await page.getByTestId("availablity-title").click();
      // change availability name
      await page.getByTestId("availablity-title").fill("Working Hours test");
      await expect(page.getByText("Mon - Fri, 9:00 AM - 5:00 PM")).toBeVisible();
      await page.locator("label").filter({ hasText: sunday }).getByRole("switch").click();
      await page.locator("div").filter({ hasText: monday }).first().click();
      await page.locator("label").filter({ hasText: wednesday }).getByRole("switch").click();
      await page.locator("label").filter({ hasText: saturday }).getByRole("switch").click();
      await page
        .locator("div")
        .filter({ hasText: "Sunday9:00am - 5:00pm" })
        .getByTestId("add-time-availability")
        .first()
        .click();
      await expect(page.locator("div").filter({ hasText: "6:00pm" }).nth(1)).toBeVisible();
      await page.getByRole("button", { name: save }).click();
      await expect(page.getByText("Sun - Tue, Thu - Sat, 9:00 AM - 5:00 PM")).toBeVisible();
      await expect(page.getByText("Sun, 5:00 PM - 6:00 PM")).toBeVisible();
      await page
        .locator("div")
        .filter({ hasText: "Sunday9:00am - 5:00pm" })
        .getByTestId("copy-button")
        .first()
        .click();
      await expect(
        page.getByText("Copy times toSelect AllSundayMondayTuesdayWednesdayThursdayFridaySaturday")
      ).toBeVisible();
      await page.getByRole("checkbox", { name: monday }).check();
      await page.getByRole("button", { name: "Apply" }).click();
      await page.getByRole("button", { name: save }).click();
      await page
        .locator("#availability-form div")
        .filter({ hasText: "TimezoneEurope/London" })
        .locator("svg")
        .click();
      await page.locator("#react-select-3-input").fill("bras");
      await page.getByTestId("select-option-America/Sao_Paulo").click();
      await page.getByRole("button", { name: save }).click();
      await expect(
        page.getByRole("button", { name: "Working Hours test schedule updated successfully" }).nth(1)
      ).toBeVisible();
      await page.getByTestId("add-override").click();
      await page.getByTestId("incrementMonth").click();
      await page.getByRole("button", { name: "20" }).click();
      await page.getByTestId("date-override-mark-unavailable").click();
      await page.getByTestId("add-override-submit-btn").click();
      await page.getByTestId("dialog-rejection").click();
      await page.getByRole("heading", { name: "Wed, 20 December" }).click();
      await page.getByTestId("date-overrides-list").getByRole("button").nth(1).click();
      await page.getByRole("button", { name: save }).click();
    },
  };
}
