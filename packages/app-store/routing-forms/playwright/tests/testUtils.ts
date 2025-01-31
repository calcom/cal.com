import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { fieldTypesConfigMap } from "@calcom/features/form-builder/fieldTypes";

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

export async function addOneFieldAndDescriptionAndSaveForm(
  formId: string,
  page: Page,
  form: { description?: string; field?: { typeIndex: number; label: string } }
) {
  await page.goto(`apps/routing-forms/form-edit/${formId}`);
  await page.click('[data-testid="add-field"]');
  if (form.description) {
    await page.fill('[data-testid="description"]', form.description);
  }

  // Verify all Options of SelectBox
  const { optionsInUi: types } = await verifySelectOptions(
    { selector: ".data-testid-field-type", nth: 0 },
    page
  );

  const nextFieldIndex = (await page.locator('[data-testid="field"]').count()) - 1;

  if (form.field) {
    await page.fill(`[data-testid="fields.${nextFieldIndex}.label"]`, form.field.label);
    await page
      .locator('[data-testid="field"]')
      .nth(nextFieldIndex)
      .locator(".data-testid-field-type")
      .click();
    await page
      .locator('[data-testid="field"]')
      .nth(nextFieldIndex)
      .locator('[id*="react-select-"][aria-disabled]')
      .nth(form.field.typeIndex)
      .click();
  }
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
  page: Page,
  expectedOptions?: string[]
) {
  await page.click('[data-testid="add-field"]');

  if (!expectedOptions) {
    expectedOptions = Object.values(fieldTypesConfigMap)
      .filter((field) => !field.systemOnly)
      .map((field) => field.label);
  }

  await page.locator(selector.selector).nth(selector.nth).click();
  const selectOptions = await page
    .locator(selector.selector)
    .nth(selector.nth)
    .locator('[id*="react-select-"][aria-disabled]')
    .allInnerTexts();

  // At this point, check that rendered labels are the same as expected labels.
  const sortedSelectOptions = [...selectOptions].sort();
  const sortedExpectedOptions = [...expectedOptions].sort();
  expect(sortedSelectOptions).toEqual(sortedExpectedOptions);

  await page.locator('[data-testid="dialog-rejection"]').click();

  // Get all fields by value. This is necessary because data-testid of the option
  // uses values, not label.
  // i.e [data-testid="select-option-textarea"] not [data-testid="select-option-Long Text]
  const optionsByValue = Object.values(fieldTypesConfigMap)
    .filter((field) => !field.systemOnly)
    .map((field) => field.value);

  return {
    optionsInUi: optionsByValue,
  };
}
