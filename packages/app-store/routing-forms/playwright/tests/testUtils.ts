import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function addForm(
  page: Page,
  {
    name = "Test Form Name",
    forTeam,
  }: {
    name?: string;
    forTeam?: boolean;
  } = {}
) {
  await page.goto(`/routing-forms/forms`);
  await page.click('[data-testid="new-routing-form"]');

  if (forTeam) {
    await page.click('[data-testid="option-team-1"]');
  } else {
    await page.click('[data-testid="option-0"]');
  }

  await page.fill("input[name]", name);
  await page.click('[data-testid="add-form"]');
  await page.waitForSelector('[data-testid="add-field"]');
  const url = page.url();
  const formId = new URL(url).pathname.split("/").at(-1);
  if (!formId) {
    throw new Error("Form ID couldn't be determined from url");
  }
  return formId;
}

const FIELD_TYPE_SELECTOR = '[data-testid="test-field-type"]';

export async function addOneFieldAndDescriptionAndSaveForm(
  formId: string,
  page: Page,
  form: { name: string; description?: string; field?: { typeIndex: number; label: string } }
) {
  await page.goto(`apps/routing-forms/form-edit/${formId}`);
  await expect(page.locator('[name="name"]')).toHaveValue(form.name);
  await page.click('[data-testid="add-field"]');
  await page.locator('[data-testid="edit-field-dialog"]').waitFor({ state: "visible" });
  if (form.description) {
    await page.fill('[data-testid="description"]', form.description);
  }

  const { optionsInUi: types } = await verifySelectOptions(
    { selector: FIELD_TYPE_SELECTOR, nth: 0 },
    [
      "Address",
      "Checkbox",
      "Checkbox Group",
      "Email",
      "Long Text",
      "MultiSelect",
      "Multiple Emails",
      "Number",
      "Phone",
      "Radio Group",
      "Select",
      "Short Text",
      "URL",
    ],
    page
  );

  const dialog = page.locator('[data-testid="edit-field-dialog"]');
  if (form.field) {
    await page.locator(FIELD_TYPE_SELECTOR).click();
    await page.locator('[data-testid^="select-option-"]').nth(form.field.typeIndex).click();
    await dialog.locator('[name="label"]').fill(form.field.label);
    await dialog.locator('[name="name"]').fill(form.field.label);
  } else {
    await dialog.locator('[name="label"]').fill("Field");
    await dialog.locator('[name="name"]').fill("field");
  }
  await page.locator('[data-testid="field-add-save"]').click();
  await saveCurrentForm(page);
  return {
    types,
  };
}

export async function saveCurrentForm(page: Page) {
  await page.click('[data-testid="update-form"]');
  await page.waitForSelector(".data-testid-toast-success");
}

export async function verifySelectOptions(
  selector: { selector: string; nth: number },
  expectedOptions: string[],
  page: Page
) {
  await page.locator(selector.selector).nth(selector.nth).click();
  const selectOptions = await page.locator('[data-testid^="select-option-"]').allInnerTexts();

  const sortedSelectOptions = [...selectOptions].sort();
  const sortedExpectedOptions = [...expectedOptions].sort();
  expect(sortedSelectOptions).toEqual(sortedExpectedOptions);
  return {
    optionsInUi: selectOptions,
  };
}
