import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { test } from "@calcom/web/playwright/lib/fixtures";

function todo(title: string) {
  // eslint-disable-next-line playwright/no-skipped-test, @typescript-eslint/no-empty-function
  test.skip(title, () => {});
}

test.describe("Routing Forms", () => {
  test.describe("Zero State Routing Forms", () => {
    test("should be able to add a new form and view it", async ({ page }) => {
      await page.waitForSelector('[data-testid="empty-screen"]');

      const formId = await addForm(page);

      await page.click('[href="/apps/routing-forms/forms"]');
      // TODO: Workaround for bug in https://github.com/calcom/cal.com/issues/3410
      await page.click('[href="/apps/routing-forms/forms"]');

      await page.waitForSelector('[data-testid="routing-forms-list"]');
      // Ensure that it's visible in forms list
      expect(await page.locator('[data-testid="routing-forms-list"] > li').count()).toBe(1);

      await gotoRoutingLink(page, formId);
      await page.isVisible("text=Test Form Name");

      await page.goto(`apps/routing-forms/route-builder/${formId}`);
      await page.click('[data-testid="toggle-form"] [value="on"]');
      await gotoRoutingLink(page, formId);
      await page.isVisible("text=ERROR 404");
    });

    test("should be able to edit the form", async ({ page }) => {
      const formId = await addForm(page);
      const description = "Test Description";

      const label = "Test Label";

      const createdFields: Record<number, { label: string; typeIndex: number }> = {};

      const { types } = await addMultipleFieldsAndSaveForm(formId, page, { description, label });

      await page.reload();

      expect(await page.inputValue(`[data-testid="description"]`)).toBe(description);
      expect(await page.locator('[data-testid="field"]').count()).toBe(types.length);

      types.forEach((item, index) => {
        createdFields[index] = { label: `Test Label ${index + 1}`, typeIndex: index };
      });
      await expectCurrentFormToHaveFields(page, createdFields, types);

      await page.click('[href*="/apps/routing-forms/route-builder/"]');
      await selectNewRoute(page);

      await page.click('[data-testid="add-rule"]');

      const options = Object.values(createdFields).map((item) => item.label);
      await verifyFieldOptionsInRule(options, page);
    });

    test.describe("F1<-F2 Relationship", () => {
      // TODO: Fix this test, it is very flaky
      // prettier-ignore
      test.fixme("Create relationship by adding F1 as route.Editing F1 should update F2", async ({ page }) => {
        const form1Id = await addForm(page, { name: "F1" });
        const form2Id = await addForm(page, { name: "F2" });

        await addOneFieldAndDescriptionAndSaveForm(form1Id, page, {
          description: "Form 1 Description",
          field: {
            label: "F1 Field1",
            typeIndex: 1,
          },
        });

        const { types } = await addOneFieldAndDescriptionAndSaveForm(form2Id, page, {
          description: "Form 2 Description",
          field: {
            label: "F2 Field1",
            //TODO: Maybe choose some other type and choose type by it's name and not index
            typeIndex: 1,
          },
        });

        // Add F1 as Router to F2
        await page.goto(`/apps/routing-forms/route-builder/${form2Id}`);
        await selectNewRoute(page, {
          // It should be F1. TODO: Verify that it's F1
          routeSelectNumber: 2,
        });
        await saveCurrentForm(page);

        // Expect F1 fields to be available in F2
        await page.goto(`/apps/routing-forms/form-edit/${form2Id}`);
        //FIXME: Figure out why this delay is required. Without it field count comes out to be 1 only
        await new Promise((resolve) => setTimeout(resolve, 1000));

        expect(await page.locator('[data-testid="field"]').count()).toBe(2);
        await expectCurrentFormToHaveFields(page, { 1: { label: "F1 Field1", typeIndex: 1 } }, types);
        // Add 1 more field in F1
        await addOneFieldAndDescriptionAndSaveForm(form1Id, page, {
          field: {
            label: "F1 Field2",
            typeIndex: 1,
          },
        });

        await page.goto(`/apps/routing-forms/form-edit/${form2Id}`);
        //FIXME: Figure out why this delay is required. Without it field count comes out to be 1 only
        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(await page.locator('[data-testid="field"]').count()).toBe(3);
        await expectCurrentFormToHaveFields(page, { 2: { label: "F1 Field2", typeIndex: 1 } }, types);
      });
      todo("Create relationship by using duplicate with live connect");
    });

    // TODO: How to install the app just once?
    test.beforeEach(async ({ page, users }) => {
      const user = await users.create(
        { username: "routing-forms" },
        {
          hasTeam: true,
        }
      );
      await user.login();
      // Install app
      await page.goto(`/apps/routing-forms`);
      await page.click('[data-testid="install-app-button"]');
      await page.waitForNavigation({
        url: (url) => url.pathname === `/apps/routing-forms/forms`,
      });
    });

    test.afterEach(async ({ users }) => {
      // This also delete forms on cascade
      await users.deleteAll();
    });
  });

  todo("should be able to duplicate form");

  test.describe("Seeded Routing Form ", () => {
    test.afterEach(async ({ users }) => {
      // This also delete forms on cascade
      await users.deleteAll();
    });
    const createUserAndLoginAndInstallApp = async function ({
      users,
      page,
    }: {
      users: Fixtures["users"];
      page: Page;
    }) {
      const user = await users.create(
        { username: "routing-forms" },
        { seedRoutingForms: true, hasTeam: true }
      );
      await user.login();
      // Install app
      await page.goto(`/apps/routing-forms`);
      await page.click('[data-testid="install-app-button"]');
      await page.waitForNavigation({
        url: (url) => url.pathname === `/apps/routing-forms/forms`,
      });
      return user;
    };

    test("Routing Link - Reporting and CSV Download ", async ({ page, users }) => {
      const user = await createUserAndLoginAndInstallApp({ users, page });
      const routingForm = user.routingForms[0];
      test.setTimeout(120000);
      // Fill form when you are logged out
      await users.logout();

      await fillSeededForm(page, routingForm.id);

      // Log back in to view form responses.
      await user.login();

      await page.goto(`/apps/routing-forms/reporting/${routingForm.id}`);
      // Can't keep waiting forever. So, added a timeout of 5000ms
      await page.waitForResponse((response) => response.url().includes("viewer.appRoutingForms.report"), {
        timeout: 5000,
      });
      const headerEls = page.locator("[data-testid='reporting-header'] th");
      // Once the response is there, React would soon render it, so 500ms is enough
      // FIXME: Sometimes it takes more than 500ms, so added a timeout of 1000ms for now. There might be something wrong with rendering.
      await headerEls.first().waitFor({
        timeout: 1000,
      });
      const numHeaderEls = await headerEls.count();
      const headers = [];
      for (let i = 0; i < numHeaderEls; i++) {
        headers.push(await headerEls.nth(i).innerText());
      }

      const responses = [];
      const responseRows = page.locator("[data-testid='reporting-row']");
      const numResponseRows = await responseRows.count();
      for (let i = 0; i < numResponseRows; i++) {
        const rowLocator = responseRows.nth(i).locator("td");
        const numRowEls = await rowLocator.count();
        const rowResponses = [];
        for (let j = 0; j < numRowEls; j++) {
          rowResponses.push(await rowLocator.nth(j).innerText());
        }
        responses.push(rowResponses);
      }

      expect(headers).toEqual(["Test field", "Multi Select"]);
      expect(responses).toEqual([
        ["event-routing", ""],
        ["external-redirect", ""],
        ["custom-page", ""],
      ]);

      const [download] = await Promise.all([
        // Start waiting for the download
        page.waitForEvent("download"),
        // Perform the action that initiates download
        page.click('[data-testid="download-responses"]'),
      ]);
      const downloadStream = await download.createReadStream();
      expect(download.suggestedFilename()).toEqual(`${routingForm.name}-${routingForm.id}.csv`);
      const csv: string = await new Promise((resolve) => {
        let body = "";
        downloadStream?.on("data", (chunk) => {
          body += chunk;
        });
        downloadStream?.on("end", () => {
          resolve(body);
        });
      });
      const csvRows = csv.trim().split("\n");
      const csvHeaderRow = csvRows[0];
      expect(csvHeaderRow).toEqual("Test field,Multi Select,Submission Time");

      const firstResponseCells = csvRows[1].split(",");
      const secondResponseCells = csvRows[2].split(",");
      const thirdResponseCells = csvRows[3].split(",");

      expect(firstResponseCells.slice(0, -1).join(",")).toEqual("event-routing,");
      expect(new Date(firstResponseCells.at(-1) as string).getDay()).toEqual(new Date().getDay());

      expect(secondResponseCells.slice(0, -1).join(",")).toEqual("external-redirect,");
      expect(new Date(secondResponseCells.at(-1) as string).getDay()).toEqual(new Date().getDay());

      expect(thirdResponseCells.slice(0, -1).join(",")).toEqual("custom-page,");
      expect(new Date(thirdResponseCells.at(-1) as string).getDay()).toEqual(new Date().getDay());
    });

    test("Router URL should work", async ({ page, users }) => {
      const user = await createUserAndLoginAndInstallApp({ users, page });
      const routingForm = user.routingForms[0];

      // Router should be publicly accessible
      await users.logout();
      page.goto(`/router?form=${routingForm.id}&Test field=event-routing`);
      await page.waitForNavigation({
        url(url) {
          return url.pathname.endsWith("/pro/30min");
        },
      });

      page.goto(`/router?form=${routingForm.id}&Test field=external-redirect`);
      await page.waitForNavigation({
        url(url) {
          return url.hostname.includes("google.com");
        },
      });

      await page.goto(`/router?form=${routingForm.id}&Test field=custom-page`);
      await page.isVisible("text=Custom Page Result");

      await page.goto(`/router?form=${routingForm.id}&Test field=doesntmatter&multi=Option-2`);
      await page.isVisible("text=Multiselect chosen");
    });

    test("Routing Link should validate fields", async ({ page, users }) => {
      const user = await createUserAndLoginAndInstallApp({ users, page });
      const routingForm = user.routingForms[0];
      await gotoRoutingLink(page, routingForm.id);
      page.click('button[type="submit"]');
      const firstInputMissingValue = await page.evaluate(() => {
        return document.querySelectorAll("input")[0].validity.valueMissing;
      });
      expect(firstInputMissingValue).toBe(true);
      expect(await page.locator('button[type="submit"][disabled]').count()).toBe(0);
    });

    test("Test preview should return correct route", async ({ page, users }) => {
      const user = await createUserAndLoginAndInstallApp({ users, page });
      const routingForm = user.routingForms[0];
      page.goto(`apps/routing-forms/form-edit/${routingForm.id}`);
      await page.click('[data-testid="test-preview"]');

      // //event redirect
      await page.fill('[data-testid="form-field"]', "event-routing");
      await page.click('[data-testid="test-routing"]');
      let routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      let route = await page.locator('[data-testid="test-routing-result"]').innerText();
      await expect(routingType).toBe("Event Redirect");
      await expect(route).toBe("pro/30min");

      //custom page
      await page.fill('[data-testid="form-field"]', "custom-page");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      await expect(routingType).toBe("Custom Page");
      await expect(route).toBe("Custom Page Result");

      //external redirect
      await page.fill('[data-testid="form-field"]', "external-redirect");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      await expect(routingType).toBe("External Redirect");
      await expect(route).toBe("https://google.com");

      //fallback route
      await page.fill('[data-testid="form-field"]', "fallback");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      await expect(routingType).toBe("Custom Page");
      await expect(route).toBe("Fallback Message");
    });
  });
});

async function expectCurrentFormToHaveFields(
  page: Page,
  fields: {
    [key: number]: { label: string; typeIndex: number };
  },
  types: string[]
) {
  for (const [index, field] of Object.entries(fields)) {
    expect(await page.inputValue(`[name="fields.${index}.label"]`)).toBe(field.label);
    expect(await page.locator(".data-testid-field-type").nth(+index).locator("div").nth(1).innerText()).toBe(
      types[field.typeIndex]
    );
  }
}

async function fillSeededForm(page: Page, routingFormId: string) {
  await gotoRoutingLink(page, routingFormId);
  await page.fill('[data-testid="form-field"]', "event-routing");
  page.click('button[type="submit"]');
  await page.waitForNavigation({
    url(url) {
      return url.pathname.endsWith("/pro/30min");
    },
  });

  await gotoRoutingLink(page, routingFormId);
  await page.fill('[data-testid="form-field"]', "external-redirect");
  page.click('button[type="submit"]');
  await page.waitForNavigation({
    url(url) {
      return url.hostname.includes("google.com");
    },
  });

  await gotoRoutingLink(page, routingFormId);
  await page.fill('[data-testid="form-field"]', "custom-page");
  await page.click('button[type="submit"]');
  await page.isVisible("text=Custom Page Result");
}

export async function addForm(page: Page, { name = "Test Form Name" } = {}) {
  await page.goto("/apps/routing-forms/forms");
  await page.click('[data-testid="new-routing-form"]');
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

async function addMultipleFieldsAndSaveForm(
  formId: string,
  page: Page,
  form: { description: string; label: string }
) {
  await page.goto(`apps/routing-forms/form-edit/${formId}`);
  await page.click('[data-testid="add-field"]');
  await page.fill('[data-testid="description"]', form.description);

  const { optionsInUi: types } = await verifySelectOptions(
    { selector: ".data-testid-field-type", nth: 0 },
    ["Email", "Long Text", "MultiSelect", "Number", "Phone", "Select", "Short Text"],
    page
  );
  await page.fill(`[name="fields.0.label"]`, `${form.label} 1`);

  await page.click('[data-testid="add-field"]');

  const withoutFirstValue = [...types].filter((val) => val !== "Short Text");

  for (let index = 0; index < withoutFirstValue.length; index++) {
    const fieldName = withoutFirstValue[index];
    const nth = index + 1;
    const label = `${form.label} ${index + 2}`;

    await page.locator(".data-testid-field-type").nth(nth).click();
    await page.locator(`[data-testid="select-option-${fieldName}"]`).click();
    await page.fill(`[name="fields.${nth}.label"]`, label);
    if (index !== withoutFirstValue.length - 1) {
      await page.click('[data-testid="add-field"]');
    }
  }

  await saveCurrentForm(page);
  return {
    types,
  };
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
    ["Email", "Long Text", "MultiSelect", "Number", "Phone", "Select", "Short Text"],
    page
  );

  const nextFieldIndex = (await page.locator('[data-testid="field"]').count()) - 1;

  if (form.field) {
    await page.fill(`[name="fields.${nextFieldIndex}.label"]`, form.field.label);
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

async function selectOption({
  page,
  selector,
  option,
}: {
  page: Page;
  selector: { selector: string; nth: number };
  option: number;
}) {
  const locatorForSelect = page.locator(selector.selector).nth(selector.nth);
  await locatorForSelect.click();
  await locatorForSelect
    .locator('[id*="react-select-"][aria-disabled]')
    .nth(option - 1)
    .click();
}

async function verifyFieldOptionsInRule(options: string[], page: Page) {
  await verifySelectOptions(
    {
      selector: ".rule-container .data-testid-field-select",
      nth: 0,
    },
    options,
    page
  );
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

async function selectNewRoute(page: Page, { routeSelectNumber = 1 } = {}) {
  await selectOption({
    selector: {
      selector: ".data-testid-select-router",
      nth: 0,
    },
    option: routeSelectNumber,
    page,
  });
}

async function gotoRoutingLink(page: Page, formId: string) {
  await page.goto(`/forms/${formId}`);
  // HACK: There seems to be some issue with the inputs to the form getting reset if we don't wait.
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function saveCurrentForm(page: Page) {
  await page.click('[data-testid="update-form"]');
  await page.waitForSelector(".data-testid-toast-success");
}
