import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { addField } from "routing-forms/playwright/tests/basic.e2e";

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
  form: { description?: string; field: { typeIndex: number; label: string } }
) {
  // go to form
  await page.goto(`apps/routing-forms/form-edit/${formId}`);

  // add description if provided
  if (form.description) {
    await page.fill('[data-testid="description"]', form.description);
  }

  // verify select options
  await page.click('[data-testid="add-field"]');
  const { optionsInUi: fieldTypesByValue } = await verifySelectOptions(
    { selector: ".data-testid-field-type", nth: 0 },
    page
  );
  if ((await page.locator('[data-testid="dialog-rejection"]').count()) > 0) {
    await page.locator('[data-testid="dialog-rejection"]').click();
  }

  // add field
  const label = form.field.label;
  const fieldTypeTestId = fieldTypesByValue[form.field.typeIndex].toLowerCase();
  const identifier = fieldTypeTestId;

  await addField({
    page,
    label,
    fieldTypeTestIdLabel: fieldTypeTestId,
    identifier,
  });

  // save form
  await saveCurrentForm(page);

  // return field details
  return {
    label,
    fieldTypeTestId,
    identifier,
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

  // Get all fields by value. This is necessary because data-testid of the option
  // uses values, not label.
  // i.e [data-testid="select-option-textarea"] not [data-testid="select-option-Long Text]
  const optionsByValue = Object.values(fieldTypesConfigMap)
    .filter((field) => !field.systemOnly)
    .map((field) => field.value);

  return {
    optionsInUi: optionsByValue,
    optionsByLabel: selectOptions,
  };
}
