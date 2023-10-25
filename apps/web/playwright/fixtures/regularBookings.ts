import { expect, type Page } from "@playwright/test";

import { randomString } from "@calcom/lib/random";

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

export async function loginUser(users: UserFixture) {
  const pro = await users.create({ name: "testuser" });
  await pro.apiLogin();
}

export function createBookingPageFixture(page: Page) {
  return {
    goToEventType: async (
      eventType: string,
      options?: {
        clickOnFirst?: boolean;
        clickOnLast?: boolean;
      }
    ) => {
      if (options?.clickOnFirst) {
        await page.getByRole("link", { name: eventType }).first().click();
      }
      if (options?.clickOnLast) {
        await page.getByRole("link", { name: eventType }).last().click();
      } else {
        await page.getByRole("link", { name: eventType }).click();
      }
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
    updateEventType: async (options: { shouldCheck?: boolean }) => {
      await page.getByTestId("update-eventtype").click();
      options.shouldCheck &&
        (await expect(
          page.getByRole("button", { name: "Test Managed Event Type event type updated successfully" })
        ).toBeVisible());
    },
    previewEventType: async () => {
      const eventtypePromise = page.waitForEvent("popup");
      await page.getByTestId("preview-button").click();
      return eventtypePromise;
    },
    selectTimeSlot: async (eventTypePage: Page) => {
      while (await eventTypePage.getByRole("button", { name: "View next" }).isVisible()) {
        await eventTypePage.getByRole("button", { name: "View next" }).click();
      }
      await eventTypePage.getByTestId("time").first().click();
    },
    clickReschedule: async () => {
      await page.getByText("Reschedule").click();
    },
    navigateToAvailableTimeSlot: async () => {
      while (await page.getByRole("button", { name: "View next" }).isVisible()) {
        await page.getByRole("button", { name: "View next" }).click();
      }
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
      await eventTypePage.getByText("Reschedule").click();
      while (await eventTypePage.getByRole("button", { name: "View next" }).isVisible()) {
        await eventTypePage.getByRole("button", { name: "View next" }).click();
      }
      await eventTypePage.getByTestId("time").first().click();
      await eventTypePage.getByPlaceholder(reschedulePlaceholderText).click();
      await eventTypePage.getByPlaceholder(reschedulePlaceholderText).fill("Test reschedule");
      await eventTypePage.getByTestId("confirm-reschedule-button").click();
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
        question === "select" && ["multiemail", "multiselect"].includes(secondQuestion);

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
      const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
      await scheduleSuccessfullyPage.waitFor({ state: "visible" });
      await expect(scheduleSuccessfullyPage).toBeVisible();
    },
    createTeam: async (name: string) => {
      await page.getByRole("link", { name: "Teams" }).click();
      await page.getByTestId("new-team-btn").click();
      await page.getByPlaceholder("Acme Inc.").click();
      await page.getByPlaceholder("Acme Inc.").fill(`${name}-${randomString(3)}`);
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Publish team" }).click();

      await page.getByTestId("vertical-tab-Back").click();
    },
    createManagedEventType: async (name: string) => {
      await page.getByTestId("new-event-type").click();
      await page.getByTestId("option-0").click();
      await page.getByTestId("dialog-rejection").click();

      // We first simulate to creste a default event type to check if managed option is not available
      await expect(
        page
          .locator("div")
          .filter({ hasText: "Managed EventCreate & distribute event types in bulk to team members" })
      ).toBeHidden();
      await page.getByTestId("new-event-type").click();
      await page.getByTestId("option-team-1").click();
      await page.getByPlaceholder("Quick Chat").fill(name);
      await page
        .locator("div")
        .filter({ hasText: "Managed EventCreate & distribute event types in bulk to team members" })
        .getByRole("radio")
        .last()
        .click();
      await expect(
        page.getByText('"username" will be filled by the username of the members assigned')
      ).toBeVisible();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByTestId("update-eventtype").click();
    },
    removeManagedEventType: async () => {
      await page
        .locator("header")
        .filter({ hasText: "Test Managed Event TypeSave" })
        .getByRole("button")
        .first()
        .click();

      // Check if the correct messages is showed in the dialog
      await expect(
        page.getByText("Members assigned to this event type will also have their event types deleted.")
      ).toBeVisible();
      await expect(
        page.getByText("Anyone who they've shared their link with will no longer be able to book using it")
      ).toBeVisible();
      await page.getByRole("button", { name: "Yes, delete" }).click();

      // Check if the correct image is showed when there is no event type
      await expect(page.getByTestId("empty-screen")).toBeVisible();
    },
    assertManagedEventTypeDeleted: async () => {
      await expect(page.getByRole("button", { name: "Event type deleted successfully" })).toBeVisible();
    },
    deleteTeam: async () => {
      await page.getByRole("link", { name: "Teams" }).click();
      await page.getByRole("link", { name: "Team Logo Test Team" }).click();
      await page.getByRole("button", { name: "Disband Team" }).click();
      await page.getByRole("button", { name: "Yes, disband team" }).click();

      // Check if the correct image is showed when there is no team
      await expect(page.getByRole("img", { name: "Cal.com is better with teams" })).toBeVisible();
    },
    assertTeamDeleted: async () => {
      await expect(
        page.getByRole("button", { name: "Your team has been disbanded successfully" })
      ).toBeVisible();
    },
    checkField: async (question: string, options?: { isOptional: boolean }) => {
      if (options?.isOptional) {
        await expect(page.getByTestId(`field-${question}-test`).getByText("Optional")).toBeVisible();
      } else {
        await expect(page.getByTestId(`field-${question}-test`).getByText("Required")).toBeVisible();
      }
      await expect(page.getByTestId(`field-${question}-test`)).toBeVisible();
    },
    fillAllQuestions: async (eventTypePage: Page, questions: string[], options: BookingOptions) => {
      const confirmButton = options.isReschedule ? "confirm-reschedule-button" : "confirm-book-button";

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
              await eventTypePage
                .getByPlaceholder("Textarea test")
                .fill("This is a sample text for textarea.");
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

      await eventTypePage.getByTestId(confirmButton).click();
      const scheduleSuccessfullyPage = eventTypePage.getByText(scheduleSuccessfullyText);
      await scheduleSuccessfullyPage.waitFor({ state: "visible" });
      await expect(scheduleSuccessfullyPage).toBeVisible();
    },
  };
}
