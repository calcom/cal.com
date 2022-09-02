import { expect, Page } from "@playwright/test";

import { seededForm } from "@calcom/prisma/seed-app-store";
import { test } from "@calcom/web/playwright/lib/fixtures";

async function gotoRoutingLink(page: Page, formId: string) {
  await page.goto(`/forms/${formId}`);
  // HACK: There seems to be some issue with the inputs to the form getting reset if we don't wait.
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function addForm(page: Page) {
  await page.click('[data-testid="new-routing-form"]');
  await page.fill("input[name]", "Test Form Name");
  await page.click('[data-testid="add-form"]');
  await page.waitForSelector('[data-testid="add-field"]');
  const url = page.url();
  const formId = new URL(url).pathname.split("/").at(-1);
  if (!formId) {
    throw new Error("Form ID couldn't be determined from url");
  }
  return formId;
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

test.describe("Routing Forms", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create({ username: "routing_forms" });
    await user.login();
    // Install app
    await page.goto(`/apps/routing_forms`);
    await page.click('[data-testid="install-app-button"]');
    await page.waitForNavigation({
      url: (url) => url.pathname === `/apps/routing_forms/forms`,
    });
  });

  test.afterEach(async ({ users }) => {
    // This also delete forms on cascade
    await users.deleteAll();
  });

  test("should be able to add a new form and view it", async ({ page }) => {
    await page.waitForSelector('[data-testid="empty-screen"]');

    const formId = await addForm(page);

    await page.click('[href="/apps/routing_forms/forms"]');
    // TODO: Workaround for bug in https://github.com/calcom/cal.com/issues/3410
    await page.click('[href="/apps/routing_forms/forms"]');

    await page.waitForSelector('[data-testid="routing-forms-list"]');

    // Ensure that it's visible in forms list
    expect(await page.locator('[data-testid="routing-forms-list"] > li').count()).toBe(1);

    await gotoRoutingLink(page, formId);
    await page.isVisible("text=Test Form Name");

    await page.goto(`apps/routing_forms/route-builder/${formId}`);
    await page.click('[data-testid="toggle-form"] [value="on"]');
    await gotoRoutingLink(page, formId);
    await page.isVisible("text=ERROR 404");
  });

  test("should be able to edit the form", async ({ page }) => {
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
    test("Routing Link should accept submission while routing works and responses can be downloaded", async ({
      page,
    }) => {
      await gotoRoutingLink(page, seededForm.id);
      await page.fill('[data-testid="field"]', "event-routing");
      page.click('button[type="submit"]');
      await page.waitForNavigation({
        url(url) {
          return url.pathname.endsWith("/pro/30min");
        },
      });

      await gotoRoutingLink(page, seededForm.id);
      await page.fill('[data-testid="field"]', "external-redirect");
      page.click('button[type="submit"]');
      await page.waitForNavigation({
        url(url) {
          return url.hostname.includes("google.com");
        },
      });

      await gotoRoutingLink(page, seededForm.id);
      await page.fill('[data-testid="field"]', "custom-page");
      await page.click('button[type="submit"]');
      await page.isVisible("text=Custom Page Result");
      await page.goto(`/apps/routing_forms/route-builder/${seededForm.id}`);
      const [download] = await Promise.all([
        // Start waiting for the download
        page.waitForEvent("download"),
        // Perform the action that initiates download
        page.click('[data-testid="download-responses"]'),
      ]);
      const downloadStream = await download.createReadStream();
      expect(download.suggestedFilename()).toEqual(`${seededForm.name}-${seededForm.id}.csv`);
      const csv: string = await new Promise((resolve) => {
        let body = "";
        downloadStream?.on("data", (chunk) => {
          body += chunk;
        });
        downloadStream?.on("end", () => {
          resolve(body);
        });
      });

      expect(csv.trim()).toEqual(
        `
"Test field :=> event-routing"
"Test field :=> external-redirect"
"Test field :=> custom-page"`.trim()
      );
    });

    test("Router URL should work", async ({ page }) => {
      page.goto(`/router?form=${seededForm.id}&Test field=event-routing`);
      await page.waitForNavigation({
        url(url) {
          return url.pathname.endsWith("/pro/30min");
        },
      });

      page.goto(`/router?form=${seededForm.id}&Test field=external-redirect`);
      await page.waitForNavigation({
        url(url) {
          return url.hostname.includes("google.com");
        },
      });

      await page.goto(`/router?form=${seededForm.id}&Test field=custom-page`);
      await page.isVisible("text=Custom Page Result");

      await page.goto(`/router?form=${seededForm.id}&Test field=doesntmatter&multi=Option-2`);
      await page.isVisible("text=Multiselect chosen");
    });

    test("Routing Link should validate fields", async ({ page }) => {
      await gotoRoutingLink(page, seededForm.id);
      page.click('button[type="submit"]');
      const firstInputMissingValue = await page.evaluate(() => {
        return document.querySelectorAll("input")[0].validity.valueMissing;
      });
      expect(firstInputMissingValue).toBe(true);
      expect(await page.locator('button[type="submit"][disabled]').count()).toBe(0);
    });
  });
});
