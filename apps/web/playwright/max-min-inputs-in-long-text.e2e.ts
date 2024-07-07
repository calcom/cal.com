import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  createNewEventType,
  doOnFreshPreviewWithSearchParams,
  selectFirstAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe.configure({
  mode: "serial",
});

test.describe("Should not have max characters and min characters for other Field Types except Long text", () => {
  test("Create a new event", async ({ page, users, context }) => {
    const eventTitle = `Min Max Characters Test`;
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
    await createNewEventType(page, { eventTitle });
    await page.waitForSelector(`text=${eventTitle}`);
    await page.click(`text=${eventTitle}`);
    await page.waitForSelector(`text=${eventTitle}`);
    await page.click('[href$="tabName=advanced"]');

    const insertQuestion = async (questionName: string, select: string) => {
      await page.click('[data-testid="add-field"]');
      const locatorForSelect = page.locator("[id=test-field-type]").nth(0);
      await locatorForSelect.click();

      const selectOption = page.locator(`[data-testid="select-option-${select}"]`);

      await selectOption.click();
      await page.fill('[name="name"]', questionName);
      await page.waitForTimeout(1000);
      await page.fill('[name="label"]', questionName);
      await page.waitForTimeout(1000);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!["checkbox"].includes(select)) {
        await page.fill('[name="placeholder"]', questionName);
      }
    };

    const saveQuestion = async () => {
      try {
        await page.click('[data-testid="field-add-save"]');
      } catch (error) {
        console.error("Error during saveQuestion:", error);
        throw error; // Rethrow the error to fail the test
      }
    };
    const cancelQuestion = async () => {
      try {
        await page.click('[data-testid="dialog-rejection"]');
      } catch (error) {
        console.error("Error during saveQuestion:", error);
        throw error; // Rethrow the error to fail the test
      }
    };
    const minLengthSelector = '[name="min-length"]';
    const maxLengthSelector = '[name="max-length"]';
    const fieldTypes = ["email", "number", "text"];
    for (const type of fieldTypes) {
      await test.step(`Add a new field with ${type}`, async () => {
        const questionName = `new ${type}`;
        await insertQuestion(questionName, type);
        await page.waitForTimeout(1000);
        const minInput = page.locator(minLengthSelector);
        const maxInput = page.locator(maxLengthSelector);
        await expect(minInput).toBeHidden();
        await expect(maxInput).toBeHidden();
        await saveQuestion();
      });
    }
    await test.step(`Add a new field with textarea`, async () => {
      const questionName = `new textarea`;
      await insertQuestion(questionName, "textarea");
      await page.waitForTimeout(1000);
      const minInput = page.locator(minLengthSelector);
      const maxInput = page.locator(maxLengthSelector);
      await expect(minInput).toBeVisible();
      await expect(maxInput).toBeVisible();
      await saveQuestion();
    });

    await test.step("Add a new field with min characters only", async () => {
      // Add a new field with min characters only
      const questionName = "Text area with min = 5";
      await insertQuestion(questionName, "textarea");
      await page.fill(minLengthSelector, "5");
      await saveQuestion();
      const toastMessage = page.locator('[data-testid="toast-error"]');
      await expect(toastMessage).toBeHidden();
    });

    await test.step("Add a new field with max characters only", async () => {
      // Add a new field with max characters only
      const questionName = "Text area with max = 10";
      await insertQuestion(questionName, "textarea");
      await page.fill(maxLengthSelector, "10");
      await saveQuestion();
      const toastMessage = page.locator('[data-testid="toast-error"]');
      await expect(toastMessage).toBeHidden();
    });

    await test.step("Add a new field with min and max characters", async () => {
      // Add a new field with max characters only
      const questionName = "Text area with min= 4 & max = 10";
      await insertQuestion(questionName, "textarea");
      await page.fill(maxLengthSelector, "10");
      await page.fill(minLengthSelector, "4");
      await saveQuestion();
      const toastMessage = page.locator('[data-testid="toast-error"]');
      await expect(toastMessage).toBeHidden();
    });

    await test.step("Add a new field without min and max characters", async () => {
      // Add a new field with max characters only
      const questionName = "Text area without min and max";
      await insertQuestion(questionName, "textarea");
      await saveQuestion();
      const toastMessage = page.locator('[data-testid="toast-error"]');
      await expect(toastMessage).toBeHidden();
    });

    await test.step("Add a new field with min and max characters where min > max", async () => {
      // Add a new field with min and max characters where min > max
      const questionName = "Text area with min = 10 & max = 5";
      await insertQuestion(questionName, "textarea");
      await page.fill(minLengthSelector, "11");
      await page.fill(maxLengthSelector, "5");
      await saveQuestion();
      const toastMessage = page.locator('[data-testid="toast-error"]');
      await expect(toastMessage).toBeVisible();
      try {
        await toastMessage?.click();
      } catch (err) {
        await cancelQuestion();
      }
      await page.click('[data-testid="update-eventtype"]');
    });
    await test.step("book an event and validate min and max characters with proper data", async () => {
      const searchParams = new URLSearchParams();
      searchParams.append("name", "FirstName");
      await doOnFreshPreviewWithSearchParams(searchParams, page, context, async (page) => {
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page, { pressEnter: false });
        await page.fill('[name="new-email"]', "test@gmail.com");
        await page.fill('[name="new-number"]', "123");
        await page.fill('[name="new-text"]', "text-test");
        await page.fill('[name="new-textarea"]', "text-testarea");
        await page.fill('[label="Text area with min = 5"]', "12345");
        await page.fill('[label="Text area with max = 10"]', "1234575757");
        await page.fill('[label="Text area with min= 4 & max = 10"]', "133e");
        await page.fill('[label="Text area without min and max"]', "1");
        await page.click('[data-testid="confirm-book-button"]');
        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
      });
    });
    await test.step("book an event and validate min and max characters(check error validation for max and min)", async () => {
      const searchParams = new URLSearchParams();
      searchParams.append("name", "FirstName");
      await doOnFreshPreviewWithSearchParams(searchParams, page, context, async (page) => {
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page, { pressEnter: false });
        await page.fill('[name="new-email"]', "test@gmail.com");
        await page.fill('[name="new-number"]', "123");
        await page.fill('[name="new-text"]', "text-test");
        await page.fill('[name="new-textarea"]', "text-testarea");
        await page.fill('[label="Text area with min = 5"]', "1234");
        await page.fill('[label="Text area with max = 10"]', "12345757579393993");
        await page.fill('[label="Text area with min= 4 & max = 10"]', "1");
        await page.fill('[label="Text area without min and max"]', "1");
        await page.click('[data-testid="confirm-book-button"]');
        await expect(page.locator('[data-testid="error-message-Text-area-with-min---5"]')).toBeVisible();
        await page.waitForTimeout(1000);
        await page.fill('[label="Text area with min = 5"]', "12345");
        await page.click('[data-testid="confirm-book-button"]');
        await page.waitForTimeout(1000);
        await expect(
          page.locator('[data-testid="error-message-Text-area-with-min--4---max---10"]')
        ).toBeVisible();
        await page.waitForTimeout(1000);
        await page.fill('[label="Text area with min= 4 & max = 10"]', "12345");
        await page.click('[data-testid="confirm-book-button"]');
        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
      });
    });
  });
});
