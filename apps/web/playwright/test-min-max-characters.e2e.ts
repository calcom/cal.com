import { expect } from "@playwright/test";

import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";

import { test } from "./lib/fixtures";
import { createNewEventType } from "./lib/testUtils";

test.describe.configure({
  mode: "serial",
});
test.describe("Text area min and max characters text", () => {
  test("Create a new event", async ({ page, users }) => {
    const eventTitle = `Min Max Characters Test`;
    const fieldType = fieldTypesConfigMap["textarea"];
    const MAX_LENGTH = fieldType?.supportsLengthCheck?.maxLength;

    // We create a new event type
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/event-types");

    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await createNewEventType(page, { eventTitle });
    await page.waitForSelector(`text=${eventTitle}`);

    // Click on the event type
    await page.click(`text=${eventTitle}`);
    await page.waitForSelector(`text=${eventTitle}`);

    // goto the advanced tab
    await page.click('[href$="tabName=advanced"]');
    const insertQuestion = async (questionName: string) => {
      await page.click('[data-testid="add-field"]');
      const locatorForSelect = page.locator("[id=test-field-type]").nth(0);
      await locatorForSelect.click();
      await locatorForSelect.locator(`text="Long Text"`).click();

      await page.fill('[name="name"]', questionName);
      await page.fill('[name="label"]', questionName);
      await page.fill('[name="placeholder"]', questionName);
    };

    const saveQuestion = async () => {
      await page.click('[data-testid="field-add-save"]');
    };
    const cancelQuestion = async () => {
      await page.click('[data-testid="dialog-rejection"]');
    };
    const minLengthSelector = '[name="minLength"]';
    const maxLengthSelector = '[name="maxLength"]';
    const minInput = await page.locator(minLengthSelector);
    const maxInput = await page.locator(maxLengthSelector);
    let questionName;
    await test.step("Add a new field with no min and max characters", async () => {
      // Add a new field with no min and max characters
      questionName = "Text area without min & max";
      await insertQuestion(questionName);
      await saveQuestion();
    });

    await test.step("Add a new field with min characters only", async () => {
      // Add a new field with min characters only
      questionName = "Text area with min = 5";
      await insertQuestion(questionName);
      await page.fill(minLengthSelector, "5");
      await saveQuestion();
    });
    await test.step("Add a new field with max characters only", async () => {
      // Add a new field with max characters only
      questionName = "Text area with max = 10";
      await insertQuestion(questionName);
      await page.fill(maxLengthSelector, "10");
      await saveQuestion();
    });

    await test.step("Add a new field with min and max characters where min < max", async () => {
      // Add a new field with min and max characters where min < max
      questionName = "Text area with min = 5 & max = 10";
      await insertQuestion(questionName);
      await page.fill(minLengthSelector, "5");
      await page.fill(maxLengthSelector, "10");
      await saveQuestion();
    });

    await test.step("Add a new field with min and max characters where min > max", async () => {
      // Add a new field with min and max characters where min > max
      questionName = "Text area with min = 10 & max = 5";
      await insertQuestion(questionName);
      await page.fill(minLengthSelector, "10");
      await page.fill(maxLengthSelector, "5");
      await saveQuestion();
    });

    await test.step("Try with different inputs and check for validation", async () => {
      // Expect the native <input> element to show an error message

      let validationMessage = await minInput?.evaluate((input: any) => input?.validationMessage as string);
      expect(validationMessage?.toString()).toBe("Value must be less than or equal to 5.");

      await page.fill(minLengthSelector, "0");
      await page.fill(maxLengthSelector, "100000");
      await saveQuestion();
      // Expect the native <input> element to show an error message

      validationMessage = await maxInput?.evaluate((input: any) => input?.validationMessage as string);

      expect(validationMessage?.toString()).toBe(
        `Value must be less than or equal to ${MAX_LENGTH || 1000}.`
      );
      await cancelQuestion();
      // Save the event type
      await page.locator("[data-testid=update-eventtype]").click();

      // Get the url of data-testid="preview-button"
      const previewButton = await page.locator('[data-testid="preview-button"]');
      const previewButtonHref = (await previewButton.getAttribute("href")) ?? "";
      await page.goto(previewButtonHref);

      // wait until the button with data-testid="time" is visible
      await page.locator('[data-testid="time"]').isVisible();

      // Get first button with data-testid="time"
      const timeButton = page.locator('[data-testid="time"]').first();
      await timeButton.click();

      await page.locator('text="Additional notes"');
      // Form fields:
      const textAreaWithoutMinMax = page.locator('[name="Text-area-without-min---max"]');
      const textAreaWithMin5 = page.locator('[name="Text-area-with-min---5"]');
      const textAreaWithMax10 = page.locator('[name="Text-area-with-max---10"]');
      const textAreaWithMin5Max10 = page.locator('[name="Text-area-with-min---5---max---10"]');

      // Get button with data-testid="confirm-book-button"
      const submitForm = async () => await page.locator('[data-testid="confirm-book-button"]').click();
      await textAreaWithoutMinMax.fill("1234567890");
      await textAreaWithMin5.fill("1234");
      await textAreaWithMax10.fill("12345678901");
      await textAreaWithMin5Max10.fill("1234");
      await submitForm();
      // Expect the text: Min. 5 characters to be visible
      expect(await page.locator(`text=Min. 5 characters required`).isVisible()).toBe(true);

      // update the text area with min 5 to have 5 characters
      await textAreaWithMin5.fill("12345");
      await submitForm();

      // Expect the text: Min. 5 characters to still be visible because textAreaWithMin5Max10 has less than 5 characters
      expect(await page.locator(`text=Min. 5 characters required`).isVisible()).toBe(true);

      // Expect the text: Max. 10 characters to be visible and have value 1234567890
      expect(await textAreaWithMax10.inputValue()).toBe("1234567890");
      await submitForm();

      // update the text area with min 5 and max 10 to have 6 characters
      await textAreaWithMin5Max10.fill("123456");
      await submitForm();

      // Expect the text: Max. 5 characters to be hidden
      expect(await page.locator(`text=Min. 5 characters required`).isVisible()).toBe(false);

      await expect(page.locator('text="This meeting is scheduled"')).toBeVisible();
    });
  });
});
