import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { test } from "@calcom/web/playwright/lib/fixtures";
import { NotFoundPageTextAppDir, gotoRoutingLink } from "@calcom/web/playwright/lib/testUtils";

import {
  addForm,
  saveCurrentForm,
  verifySelectOptions,
  addOneFieldAndDescriptionAndSaveForm,
} from "./testUtils";

function todo(title: string) {
  // eslint-disable-next-line playwright/no-skipped-test, @typescript-eslint/no-empty-function
  test.skip(title, () => {});
}

test.describe("Routing Forms", () => {
  test.describe("Zero State Routing Forms", () => {
    test("should be able to add a new form and view it", async ({ page }) => {
      await page.waitForSelector('[data-testid="empty-screen"]');

      const formId = await addForm(page);

      await page.click('[href*="/forms"]');

      await page.waitForSelector('[data-testid="routing-forms-list"]');
      // Ensure that it's visible in forms list
      expect(await page.locator('[data-testid="routing-forms-list"] > div').count()).toBe(1);

      await gotoRoutingLink({ page, formId });
      await expect(page.locator("text=Test Form Name")).toBeVisible();

      await page.goto(`apps/routing-forms/route-builder/${formId}`);
      await disableForm(page);
      await gotoRoutingLink({ page, formId });
      await expect(page.locator(`text=${NotFoundPageTextAppDir}`)).toBeVisible();
    });

    test("should be able to edit the form", async ({ page }) => {
      const formId = await addForm(page);
      const description = "Test Description";

      const label = "Test Label";

      const createdFields: Record<number, { label: string; typeIndex: number }> = {};

      const { fieldTypesList: types, fields } = await addAllTypesOfFieldsAndSaveForm(formId, page, {
        description,
        label,
      });

      expect(await page.inputValue(`[data-testid="description"]`)).toBe(description);
      expect(await page.locator('[data-testid="field"]').count()).toBe(types.length);

      fields.forEach((item, index) => {
        createdFields[index] = { label: item.label, typeIndex: index };
      });

      await expectCurrentFormToHaveFields(page, createdFields, types);

      await page.click('[href*="/route-builder/"]');
      await selectNewRoute(page);

      await page.click('[data-testid="add-rule"]');

      const options = Object.values(createdFields).map((item) => item.label);
      await verifyFieldOptionsInRule(options, page);
    });

    test.describe("F1<-F2 Relationship", () => {
      test("Create relationship by adding F1 as route.Editing F1 should update F2", async ({ page }) => {
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
        await page.goto(`/routing-forms/route-builder/${form2Id}`);
        await selectNewRoute(page, {
          // It should be F1. TODO: Verify that it's F1
          routeSelectNumber: 2,
        });
        await saveCurrentForm(page);

        // Expect F1 fields to be available in F2
        await page.goto(`/routing-forms/form-edit/${form2Id}`);
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

        await page.goto(`/routing-forms/form-edit/${form2Id}`);
        //FIXME: Figure out why this delay is required. Without it field count comes out to be 1 only
        await new Promise((resolve) => setTimeout(resolve, 1000));
        expect(await page.locator('[data-testid="field"]').count()).toBe(3);
        await expectCurrentFormToHaveFields(page, { 2: { label: "F1 Field2", typeIndex: 1 } }, types);
      });
      todo("Create relationship by using duplicate with live connect");
    });

    test("should be able to submit a prefilled form with all types of fields", async ({ page }) => {
      const formId = await addForm(page);
      await page.click('[href*="/route-builder/"]');
      await selectNewRoute(page);
      await selectOption({
        selector: {
          selector: ".data-testid-select-routing-action",
          nth: 0,
        },
        option: 2,
        page,
      });
      await page.fill("[name=externalRedirectUrl]", "https://www.google.com");
      await saveCurrentForm(page);

      const { fields } = await addAllTypesOfFieldsAndSaveForm(formId, page, {
        description: "Description",
        label: "Test Field",
      });
      const queryString =
        "firstField=456&Test Field Number=456&Test Field Single Selection=456&Test Field Multiple Selection=456&Test Field Multiple Selection=789&Test Field Phone=456&Test Field Email=456@example.com";

      await gotoRoutingLink({ page, queryString });

      await page.fill('[data-testid="form-field-Test Field Long Text"]', "manual-fill");

      expect(await page.locator(`[data-testid="form-field-firstField"]`).inputValue()).toBe("456");
      expect(await page.locator(`[data-testid="form-field-Test Field Number"]`).inputValue()).toBe("456");

      // TODO: Verify select and multiselect has prefilled values.
      // expect(await page.locator(`[data-testid="form-field-Test Field Select"]`).inputValue()).toBe("456");
      // expect(await page.locator(`[data-testid="form-field-Test Field MultiSelect"]`).inputValue()).toBe("456");

      expect(await page.locator(`[data-testid="form-field-Test Field Phone"]`).inputValue()).toBe("456");
      expect(await page.locator(`[data-testid="form-field-Test Field Email"]`).inputValue()).toBe(
        "456@example.com"
      );

      await page.click('button[type="submit"]');
      await page.waitForURL((url) => {
        return url.hostname.includes("google.com");
      });

      const url = new URL(page.url());

      // Coming from the response filled by booker
      expect(url.searchParams.get("firstField")).toBe("456");

      // All other params come from prefill URL
      expect(url.searchParams.get("Test Field Number")).toBe("456");
      expect(url.searchParams.get("Test Field Long Text")).toBe("manual-fill");
      expect(url.searchParams.get("Test Field Multiple Selection")).toBe("456");
      expect(url.searchParams.getAll("Test Field Multiple Selection")).toMatchObject(["456", "789"]);
      expect(url.searchParams.get("Test Field Phone")).toBe("456");
      expect(url.searchParams.get("Test Field Email")).toBe("456@example.com");
    });

    // TODO: How to install the app just once?
    test.beforeEach(async ({ page, users }) => {
      const user = await users.create(
        { username: "routing-forms" },
        {
          hasTeam: true,
        }
      );
      await user.apiLogin();
      await page.goto(`/routing-forms/forms`);
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
    const createUserAndLogin = async function ({ users, page }: { users: Fixtures["users"]; page: Page }) {
      const user = await users.create(
        { username: "routing-forms" },
        { seedRoutingForms: true, hasTeam: true }
      );
      await user.apiLogin();
      return user;
    };

    test("Routing Link - Reporting and CSV Download ", async ({ page, users }) => {
      const user = await createUserAndLogin({ users, page });
      const routingForm = user.routingForms[0];
      test.setTimeout(120000);
      // Fill form when you are logged out
      await users.logout();

      await fillSeededForm(page, routingForm.id);

      // Log back in to view form responses.
      await user.apiLogin();

      await page.goto(`/routing-forms/reporting/${routingForm.id}`);

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

      await page.goto(`apps/routing-forms/route-builder/${routingForm.id}`);
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
      const user = await createUserAndLogin({ users, page });
      const routingForm = user.routingForms[0];

      // Router should be publicly accessible
      await users.logout();
      page.goto(`/router?form=${routingForm.id}&Test field=event-routing`);
      await page.waitForURL((url) => {
        return url.pathname.endsWith("/pro/30min") && url.searchParams.get("Test field") === "event-routing";
      });

      page.goto(`/router?form=${routingForm.id}&Test field=external-redirect`);
      await page.waitForURL((url) => {
        return (
          url.hostname.includes("google.com") && url.searchParams.get("Test field") === "external-redirect"
        );
      });

      await page.goto(`/router?form=${routingForm.id}&Test field=custom-page`);
      await expect(page.locator("text=Custom Page Result")).toBeVisible();

      await page.goto(`/router?form=${routingForm.id}&Test field=doesntmatter&multi=Option-2`);
      await expect(page.locator("text=Multiselect chosen")).toBeVisible();
    });

    test("Routing Link should validate fields", async ({ page, users }) => {
      const user = await createUserAndLogin({ users, page });
      const routingForm = user.routingForms[0];
      await gotoRoutingLink({ page, formId: routingForm.id });
      page.click('button[type="submit"]');
      const firstInputMissingValue = await page.evaluate(() => {
        return document.querySelectorAll("input")[0].validity.valueMissing;
      });
      expect(firstInputMissingValue).toBe(true);
      expect(await page.locator('button[type="submit"][disabled]').count()).toBe(0);
    });

    test("Test preview should return correct route", async ({ page, users }) => {
      const user = await createUserAndLogin({ users, page });
      const routingForm = user.routingForms[0];
      page.goto(`apps/routing-forms/form-edit/${routingForm.id}`);
      await page.click('[data-testid="test-preview"]');
      await page.waitForLoadState("networkidle");

      // //event redirect
      await page.fill('[data-testid="form-field-Test field"]', "event-routing");
      await page.click('[data-testid="test-routing"]');
      let routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      let route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("Event Redirect");
      expect(route).toBe("pro/30min");

      //custom page
      await page.fill('[data-testid="form-field-Test field"]', "custom-page");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("Custom Page");
      expect(route).toBe("Custom Page Result");

      //external redirect
      await page.fill('[data-testid="form-field-Test field"]', "external-redirect");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("External Redirect");
      expect(route).toBe("https://google.com");

      //fallback route
      await page.fill('[data-testid="form-field-Test field"]', "fallback");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("Custom Page");
      expect(route).toBe("Fallback Message");
    });
  });
});

async function disableForm(page: Page) {
  await page.click('[data-testid="toggle-form"] [value="on"]');
  await page.waitForSelector(".data-testid-toast-success");
}

async function expectCurrentFormToHaveFields(
  page: Page,
  fields: {
    [key: number]: { label: string; typeIndex: number };
  },
  types: string[]
) {
  for (const [index, field] of Object.entries(fields)) {
    expect(await page.inputValue(`[data-testid="fields.${index}.label"]`)).toBe(field.label);
    expect(await page.locator(".data-testid-field-type").nth(+index).locator("div").nth(1).innerText()).toBe(
      types[field.typeIndex]
    );
  }
}

async function fillSeededForm(page: Page, routingFormId: string) {
  await gotoRoutingLink({ page, formId: routingFormId });
  await page.fill('[data-testid="form-field-Test field"]', "event-routing");
  page.click('button[type="submit"]');

  await page.waitForURL((url) => {
    return url.pathname.endsWith("/pro/30min");
  });

  await gotoRoutingLink({ page, formId: routingFormId });
  await page.fill('[data-testid="form-field-Test field"]', "external-redirect");
  page.click('button[type="submit"]');
  await page.waitForURL((url) => {
    return url.hostname.includes("google.com");
  });

  await gotoRoutingLink({ page, formId: routingFormId });
  await page.fill('[data-testid="form-field-Test field"]', "custom-page");
  await page.click('button[type="submit"]');
  await expect(page.locator("text=Custom Page Result")).toBeVisible();
}

async function addAllTypesOfFieldsAndSaveForm(
  formId: string,
  page: Page,
  form: { description: string; label: string }
) {
  await page.goto(`apps/routing-forms/form-edit/${formId}`);
  await page.click('[data-testid="add-field"]');
  await page.fill('[data-testid="description"]', form.description);

  const { optionsInUi: fieldTypesList } = await verifySelectOptions(
    { selector: ".data-testid-field-type", nth: 0 },
    ["Email", "Long Text", "Multiple Selection", "Number", "Phone", "Single Selection", "Short Text"],
    page
  );

  const fields = [];
  for (let index = 0; index < fieldTypesList.length; index++) {
    const fieldTypeLabel = fieldTypesList[index];
    const nth = index;
    const label = `${form.label} ${fieldTypeLabel}`;
    let identifier = "";

    if (index !== 0) {
      identifier = label;
      // Click on the field type dropdown.
      await page.locator(".data-testid-field-type").nth(nth).click();
      // Click on the dropdown option.
      await page.locator(`[data-testid^="select-option-"]`).filter({ hasText: fieldTypeLabel }).click();
    } else {
      // Set the identifier manually for the first field to test out a case when identifier isn't computed from label automatically
      // First field type is by default selected. So, no need to choose from dropdown
      identifier = "firstField";
    }

    if (fieldTypeLabel === "MultiSelect" || fieldTypeLabel === "Select") {
      await page.fill(`[name="fields.${nth}.selectText"]`, "123\n456\n789");
    }

    await page.fill(`[name="fields.${nth}.label"]`, label);

    if (identifier !== label) {
      await page.fill(`[name="fields.${nth}.identifier"]`, identifier);
    }

    if (index !== fieldTypesList.length - 1) {
      await page.click('[data-testid="add-field"]');
    }
    fields.push({ identifier: identifier, label, type: fieldTypeLabel });
  }

  await saveCurrentForm(page);
  return {
    fieldTypesList,
    fields,
  };
}

async function selectOption({
  page,
  selector,
  option,
}: {
  page: Page;
  selector: { selector: string; nth: number };
  /**
   * Index of option to select. Starts from 1
   */
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
