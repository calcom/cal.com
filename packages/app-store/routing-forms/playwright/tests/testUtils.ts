import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function addForm(page: Page, { name = "Test Form Name" } = {}) {
  await page.goto("/routing-forms/forms");
  await page.click('[data-testid="new-routing-form"]');
  // Choose to create the Form for the user(which is the first option) and not the team
  await page.click('[data-testid="option-0"]');
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
    ["Email", "Long Text", "Multiple Selection", "Number", "Phone", "Single Selection", "Short Text"],
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
  expectedOptions: string[],
  page: Page
) {
  await page.locator(selector.selector).nth(selector.nth).click();
  const selectOptions = await page
    .locator(selector.selector)
    .nth(selector.nth)
    .locator('[id*="react-select-"][aria-disabled]')
    .allInnerTexts();

  const sortedSelectOptions = [...selectOptions].sort();
  const sortedExpectedOptions = [...expectedOptions].sort();
  expect(sortedSelectOptions).toEqual(sortedExpectedOptions);
  return {
    optionsInUi: selectOptions,
  };
}
