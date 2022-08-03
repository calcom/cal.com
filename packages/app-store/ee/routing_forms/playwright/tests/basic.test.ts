import { expect, Page } from "@playwright/test";

import { test } from "../fixtures/fixtures";
import { cleanUpForms, todo } from "../lib/testUtils";

async function addForm(page: Page) {
  await page.click('[data-testid="new-routing-form"]');
  await page.fill("input[name]", "Test Form Name");
  await page.click('[data-testid="add-form"]');
  await page.waitForSelector('[data-testid="add-field"]');
}

async function verifySelectOptions(
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

async function fillForm(
  page: Page,
  form: { description: string; field?: { typeIndex: number; label: string } }
) {
  await page.click('[data-testid="add-field"]');
  await page.fill('[data-testid="description"]', form.description);

  // Verify all Options of SelectBox
  const { optionsInUi: types } = await verifySelectOptions(
    { selector: ".data-testid-field-type", nth: 0 },
    ["Email", "Long Text", "MultiSelect", "Number", "Phone", "Select", "Short Text"],
    page
  );

  if (form.field) {
    await page.fill('[name="fields.0.label"]', form.field.label);
    await page.click(".data-testid-field-type");
    await page.locator('[id*="react-select-"][aria-disabled]').nth(form.field.typeIndex).click();
  }
  await page.click('[data-testid="update-form"]');
  await page.waitForSelector(".data-testid-toast-success");
  return {
    types,
  };
}

test.use({ storageState: `playwright/artifacts/${process.env.APP_USER_NAME}StorageState.json` });
test.describe("Routing Forms", () => {
  test("should be able to add a new form and see it in forms list", async ({ page }) => {
    page.goto("/");

    await page.click('[href="/apps/routing_forms/forms"]');
    await page.waitForSelector('[data-testid="empty-screen"]');

    await addForm(page);

    await page.click('[href="/apps/routing_forms/forms"]');
    // TODO: Workaround for bug in https://github.com/calcom/cal.com/issues/3410
    await page.click('[href="/apps/routing_forms/forms"]');

    await page.waitForSelector('[data-testid="routing-forms-list"]');
    expect(await page.locator('[data-testid="routing-forms-list"] > li').count()).toBe(1);
  });

  test("should be able to edit the form", async ({ page }) => {
    await page.goto("/apps/routing_forms/forms");

    await addForm(page);
    const description = "Test Description";

    const field = {
      label: "Test Label",
      typeIndex: 1,
    };

    const { types } = await fillForm(page, {
      description,
      field: field,
    });

    await page.reload();

    expect(await page.inputValue(`[data-testid="description"]`), description);
    expect(await page.locator('[data-testid="field"]').count()).toBe(1);
    expect(await page.inputValue('[name="fields.0.label"]')).toBe(field.label);
    expect(await page.locator(".data-testid-field-type").first().innerText()).toBe(types[field.typeIndex]);

    await page.click('[href*="/apps/routing_forms/route-builder/"]');
    await page.click('[data-testid="add-route"]');
    await page.click('[data-testid="add-rule"]');
    await verifySelectOptions(
      {
        selector: ".rule-container .data-testid-field-select",
        nth: 0,
      },
      [field.label],
      page
    );
  });

  test.describe("Seeded Routing Form ", () => {
    test("Routing Link should work", async ({ page }) => {
      await page.goto("/forms/948ae412-d995-4865-875a-48302588de03");
      await page.fill('[data-testid="field"]', "event-routing");
      page.click('button[type="submit"]');
      await page.waitForNavigation({
        url(url) {
          return url.pathname.endsWith("/pro/30min");
        },
      });

      await page.goto("/forms/948ae412-d995-4865-875a-48302588de03");
      await page.fill('[data-testid="field"]', "external-redirect");
      page.click('button[type="submit"]');
      await page.waitForNavigation({
        url(url) {
          return url.hostname.includes("google.com");
        },
      });

      await page.goto("/forms/948ae412-d995-4865-875a-48302588de03");
      await page.fill('[data-testid="field"]', "custom-page");
      await page.click('button[type="submit"]');
      await page.isVisible("text=Custom Page Result");
    });

    test.only("Router URL should work", async ({ page }) => {
      page.goto("/router?form=948ae412-d995-4865-875a-48302588de03&Test field=event-routing");
      await page.waitForNavigation({
        url(url) {
          return url.pathname.endsWith("/pro/30min");
        },
      });

      page.goto("/router?form=948ae412-d995-4865-875a-48302588de03&Test field=external-redirect");
      await page.waitForNavigation({
        url(url) {
          return url.hostname.includes("google.com");
        },
      });

      await page.goto("/router?form=948ae412-d995-4865-875a-48302588de03&Test field=custom-page");
      await page.isVisible("text=Custom Page Result");

      await page.goto(
        "/router?form=948ae412-d995-4865-875a-48302588de03&Test field=doesntmatter&multi=Option-2"
      );
      await page.isVisible("text=Multiselect chosen");
    });
  });

  test.afterAll(() => {
    cleanUpForms();
  });
});
