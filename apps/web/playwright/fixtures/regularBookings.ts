import { expect, type Page } from "@playwright/test";
import type { Fixtures } from "playwright/lib/fixtures";

const reschedulePlaceholderText = "Let others know why you need to reschedule";
export const scheduleSuccessfullyText = "This meeting is scheduled";

/**
 * Logs in a user for testing purposes.
 * @param users - The user fixtures to create and log in a test user.
 */
export async function loginUser(users: Fixtures["users"]) {
  const pro = await users.create({ name: "testuser" });
  await pro.apiLogin();
}

/**
 * Navigates to a specific event type page.
 * @param page - The Playwright page instance.
 * @param eventType - The name of the event type to navigate to.
 */
export async function goToEventType(page: Page, eventType: string) {
  await page.getByRole("link", { name: eventType }).click();
}

/**
 * Navigates to a specific tab on the page.
 * @param page - The Playwright page instance.
 * @param tabName - The name (testId) of the tab to navigate to.
 */
export async function goToTab(page: Page, tabName: string) {
  await page.getByTestId(`vertical-tab-${tabName}`).click();
}

/**
 * Adds a question to the event type.
 * @param page - The Playwright page instance.
 * @param questionType - The type of question to add.
 * @param identifier - The identifier for the question.
 * @param label - The label for the question.
 * @param placeholder - (Optional) The placeholder text for the question.
 * @param isRequired - (Optional) Whether the question is required. Default is true.
 */
export async function addQuestion(
  page: Page,
  questionType: string,
  identifier: string,
  label: string,
  placeholder?: string,
  isRequired = true
) {
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
}

/**
 * Updates the current event type.
 * @param page - The Playwright page instance.
 */
export async function updateEventType(page: Page) {
  await page.getByTestId("update-eventtype").click();
}

/**
 * Opens the preview for the current event type.
 * @param page - The Playwright page instance.
 * @returns A promise that resolves to the new event type page.
 */
export async function previewEventType(page: Page) {
  const eventtypePromise = page.waitForEvent("popup");
  await page.getByTestId("preview-button").click();
  return await eventtypePromise;
}

/**
 * Selects an available time slot for booking.
 * @param page - The Playwright page instance.
 */
export async function selectTimeSlot(page: Page) {
  while (await page.getByRole("button", { name: "View next" }).isVisible()) {
    await page.getByRole("button", { name: "View next" }).click();
  }
  await page.getByTestId("time").first().click();
}

/**
 * Clicks the "Reschedule" button
 * @param eventTypePage - The Playwright page instance for the event type.
 */
export const clickReschedule = async (eventTypePage: Page) => {
  await eventTypePage.getByText("Reschedule").click();
};

/**
 * Navigates through the available time slots using the "View next" button
 * @param eventTypePage - The Playwright page instance for the event type.
 */
export const navigateToAvailableTimeSlot = async (eventTypePage: Page) => {
  while (await eventTypePage.getByRole("button", { name: "View next" }).isVisible()) {
    await eventTypePage.getByRole("button", { name: "View next" }).click();
  }
};

/**
 * Selects the first available time slot
 * @param eventTypePage - The Playwright page instance for the event type.
 */
export const selectFirstAvailableTime = async (eventTypePage: Page) => {
  await eventTypePage.getByTestId("time").first().click();
};

/**
 * Fills the reschedule reason and confirms the rescheduling
 * @param eventTypePage - The Playwright page instance for the event type.
 */
export const fillRescheduleReasonAndConfirm = async (eventTypePage: Page) => {
  await eventTypePage.getByPlaceholder(reschedulePlaceholderText).click();
  await eventTypePage.getByPlaceholder(reschedulePlaceholderText).fill("Test reschedule");
  await eventTypePage.getByTestId("confirm-reschedule-button").click();
};

/**
 * Checks if the rescheduling was successful
 * @param eventTypePage - The Playwright page instance for the event type.
 */

export const verifyReschedulingSuccess = async (eventTypePage: Page) => {
  await expect(eventTypePage.getByText(scheduleSuccessfullyText)).toBeVisible();
};

/**
 * Cancels the booking and provides a reason
 * @param eventTypePage - The Playwright page instance for the event type.
 */

export const cancelBookingWithReason = async (eventTypePage: Page) => {
  await eventTypePage.getByTestId("cancel").click();
  await eventTypePage.getByTestId("cancel_reason").fill("Test cancel");
  await eventTypePage.getByTestId("confirm_cancel").click();
};

/**
 * Checks if the booking was successfully canceled
 * @param eventTypePage - The Playwright page instance for the event type.
 */
export const verifyBookingCancellation = async (eventTypePage: Page) => {
  await expect(eventTypePage.getByTestId("cancelled-headline")).toBeVisible();
};

/**
 * Executes the entire reschedule and cancel workflow.
 * @param eventTypePage - The Playwright page instance for the event type.
 */
export async function rescheduleAndCancel(eventTypePage: Page) {
  await clickReschedule(eventTypePage);
  await navigateToAvailableTimeSlot(eventTypePage);
  await selectFirstAvailableTime(eventTypePage);
  await fillRescheduleReasonAndConfirm(eventTypePage);
  await verifyReschedulingSuccess(eventTypePage);
  await cancelBookingWithReason(eventTypePage);
  await verifyBookingCancellation(eventTypePage);
}
