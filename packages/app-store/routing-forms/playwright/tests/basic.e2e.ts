import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { AttributeType, SchedulingType } from "@calcom/prisma/enums";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { test } from "@calcom/web/playwright/lib/fixtures";
import { selectInteractions } from "@calcom/web/playwright/lib/pageObject";
import { gotoRoutingLink } from "@calcom/web/playwright/lib/testUtils";

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

const Identifiers = {
  multi: "multi",
  multiNewFormat: "multi-new-format",
  select: "test-select",
  selectNewFormat: "test-select-new-format",
};

async function enableContactOwnerOverride(page: Page) {
  await page.click("text=Contact owner will be the Round Robin host if available");
}

async function selectFirstAttributeOption({ fromLocator }: { fromLocator: Locator }) {
  await selectOptionUsingLocator({
    locator: fromLocator,
    option: 1,
  });
}

async function selectFirstValueForAttributeValue({
  fromLocator,
  option,
}: {
  fromLocator: Locator;
  option: number;
}) {
  await selectOptionUsingLocator({
    locator: fromLocator,
    option,
  });
}

async function addAttributeRoutingRule(page: Page) {
  // TODO: Use a better selector maybe?
  await page.locator('text="Add rule"').nth(1).click();
  const attributeQueryBuilder = page.locator(".group-container").nth(1);
  const attributeSelectorFirstRule = attributeQueryBuilder.locator(".rule--field").nth(0);
  await selectFirstAttributeOption({
    fromLocator: attributeSelectorFirstRule,
  });

  const attributeValueSelector = attributeQueryBuilder.locator(".rule--value").nth(0);
  await selectFirstValueForAttributeValue({
    fromLocator: attributeValueSelector,
    // Select 'Value of Field Short Text' option
    option: 1,
  });
}

async function selectFirstEventRedirectOption(page: Page) {
  await selectOption({
    selector: {
      selector: ".data-testid-eventTypeRedirectUrl-select",
      nth: 0,
    },
    option: 2,
    page,
  });
}

test.describe("Routing Forms", () => {
  test.describe("Zero State Routing Forms", () => {
    test("should be able to add a new form and view it", async ({ page }) => {
      const formId = await addForm(page);

      await page.click('[href*="/forms"]');

      await page.waitForSelector('[data-testid="routing-forms-list"]');
      // Ensure that it's visible in forms list
      await expect(page.locator('[data-testid="routing-forms-list"] > div')).toHaveCount(1);

      await gotoRoutingLink({ page, formId });
      await expect(page.locator("text=Test Form Name")).toBeVisible();

      await page.goto(`apps/routing-forms/route-builder/${formId}`);
      await disableForm(page);
      await gotoRoutingLink({ page, formId });
      await expect(page.getByTestId(`404-page`)).toBeVisible();
    });

    test("should be able to edit a newly created form", async ({ page }) => {
      const formId = await addForm(page);
      const description = "Test Description";

      const label = "Test Label";

      const createdFields: Record<number, { label: string; typeIndex: number }> = {};

      const { fieldTypesList: types, fields } = await addAllTypesOfFieldsAndSaveForm(formId, page, {
        description,
        label,
      });

      await expect(page.locator('[data-testid="description"]')).toHaveValue(description);
      await expect(page.locator('[data-testid="field"]')).toHaveCount(types.length);

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
        await page.goto(`/routing-forms/forms`);
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

        await expect(page.locator('[data-testid="field"]')).toHaveCount(2);
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
        await expect(page.locator('[data-testid="field"]')).toHaveCount(3);
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
      await page.fill("[name=externalRedirectUrl]", "https://cal.com");
      await saveCurrentForm(page);

      const { fields } = await addAllTypesOfFieldsAndSaveForm(formId, page, {
        description: "Description",
        label: "Test Field",
      });
      const queryString =
        "firstField=456&Test Field Number=456&Test Field Single Selection=456&Test Field Multiple Selection=456&Test Field Multiple Selection=789&Test Field Phone=456&Test Field Email=456@example.com";

      await gotoRoutingLink({ page, queryString });

      await page.fill('[data-testid="form-field-Test Field Long Text"]', "manual-fill");

      await expect(page.locator('[data-testid="form-field-firstField"]')).toHaveValue("456");
      await expect(page.locator('[data-testid="form-field-Test Field Number"]')).toHaveValue("456");

      // TODO: Verify select and multiselect has prefilled values.
      // expect(await page.locator(`[data-testid="form-field-Test Field Select"]`).inputValue()).toBe("456");
      // expect(await page.locator(`[data-testid="form-field-Test Field MultiSelect"]`).inputValue()).toBe("456");

      await expect(page.locator('[data-testid="form-field-Test Field Phone"]')).toHaveValue("456");
      await expect(page.locator('[data-testid="form-field-Test Field Email"]')).toHaveValue(
        "456@example.com"
      );

      await page.click('button[type="submit"]');
      await page.waitForURL((url) => {
        return url.hostname.includes("cal.com");
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
    });

    test.afterEach(async ({ users }) => {
      // This also delete forms on cascade
      await users.deleteAll();
    });
  });

  todo("should be able to duplicate form");

  test.describe("Seeded Routing Form ", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/routing-forms/forms`);
    });
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

      // Wait for the headers to be visible(will automaically wait for getting response from backend) along with it the rows are rendered.
      await headerEls.first().waitFor();

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

      expect(headers).toEqual([
        "Test field",
        "Multi Select(with Legacy `selectText`)",
        "Multi Select",
        "Legacy Select",
        "Select",
        // TODO: Find a way to incorporate Routed To and Booked At into the report
        // @see https://github.com/calcom/cal.com/pull/17229
        "Routed To",
        "Booked At",
        "Submitted At",
      ]);
      /* Last two columns are "Routed To" and "Booked At" */
      expect(responses).toEqual([
        ["custom-page", "Option-2", "Option-2", "Option-2", "Option-2", "", "", expect.any(String)],
        ["external-redirect", "Option-2", "Option-2", "Option-2", "Option-2", "", "", expect.any(String)],
        ["event-routing", "Option-2", "Option-2", "Option-2", "Option-2", "", "", expect.any(String)],
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
      expect(csvHeaderRow).toEqual(
        "Test field,Multi Select(with Legacy `selectText`),Multi Select,Legacy Select,Select,Submission Time"
      );

      const firstResponseCells = csvRows[1].split(",");
      const secondResponseCells = csvRows[2].split(",");
      const thirdResponseCells = csvRows[3].split(",");

      expect(firstResponseCells.slice(0, -1).join(",")).toEqual(
        "event-routing,Option-2,Option-2,Option-2,Option-2"
      );
      expect(new Date(firstResponseCells.at(-1) as string).getDay()).toEqual(new Date().getDay());

      expect(secondResponseCells.slice(0, -1).join(",")).toEqual(
        "external-redirect,Option-2,Option-2,Option-2,Option-2"
      );
      expect(new Date(secondResponseCells.at(-1) as string).getDay()).toEqual(new Date().getDay());

      expect(thirdResponseCells.slice(0, -1).join(",")).toEqual(
        "custom-page,Option-2,Option-2,Option-2,Option-2"
      );
      expect(new Date(thirdResponseCells.at(-1) as string).getDay()).toEqual(new Date().getDay());
    });

    test("Router URL should work", async ({ page, users }) => {
      const user = await createUserAndLogin({ users, page });
      const routingForm = user.routingForms[0];

      // Router should be publicly accessible
      await users.logout();
      await page.goto(`/router?form=${routingForm.id}&Test field=event-routing`);
      await page.waitForURL((url) => {
        return url.pathname.endsWith("/pro/30min") && url.searchParams.get("Test field") === "event-routing";
      });

      await page.goto(`/router?form=${routingForm.id}&Test field=external-redirect`);
      await page.waitForURL((url) => {
        return url.hostname.includes("cal.com") && url.searchParams.get("Test field") === "external-redirect";
      });

      await page.goto(`/router?form=${routingForm.id}&Test field=custom-page`);
      await expect(page.locator("text=Custom Page Result")).toBeVisible();

      await page.goto(`/router?form=${routingForm.id}&Test field=doesntmatter&${Identifiers.multi}=Option-2`);
      await expect(page.locator("text=Multiselect(Legacy) chosen")).toBeVisible({ timeout: 10000 });

      await page.goto(
        `/router?form=${routingForm.id}&Test field=doesntmatter&${Identifiers.multiNewFormat}=d1302635-9f12-17b1-9153-c3a854649182`
      );
      await expect(page.locator("text=Multiselect chosen")).toBeVisible({ timeout: 10000 });

      // Negative test - Ensures that the "No logic" situation where a Route is considered to be always passing isn't hitting
      await page.goto(`/router?form=${routingForm.id}&Test field=kuchbhi`);
      await page.waitForURL((url) => {
        return url.searchParams.get("Test field") === "kuchbhi";
      });

      expect(page.url()).not.toContain("/pro/30min");
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
      await expect(page.locator('button[type="submit"][disabled]')).toHaveCount(0);
    });

    test("Test preview should return correct route", async ({ page, users }) => {
      const user = await createUserAndLogin({ users, page });
      const routingForm = user.routingForms[0];
      await page.goto(`apps/routing-forms/form-edit/${routingForm.id}`);
      await page.click('[data-testid="test-preview"]');

      //event redirect
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
      expect(route).toBe("https://cal.com");
      await page.click('[data-testid="dialog-rejection"]');

      // Multiselect(Legacy)
      await page.click('[data-testid="test-preview"]');
      await page.fill('[data-testid="form-field-Test field"]', "doesntmatter");
      await page.click(`[data-testid="form-field-${Identifiers.multi}"]`); // Open dropdown
      await page.click("text=Option-2"); // Select option
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("Custom Page");
      expect(route).toBe("Multiselect(Legacy) chosen");
      await page.click('[data-testid="dialog-rejection"]');

      // Multiselect
      await page.click('[data-testid="test-preview"]');
      await page.fill('[data-testid="form-field-Test field"]', "doesntmatter");
      await page.click(`[data-testid="form-field-${Identifiers.multiNewFormat}"]`); // Open dropdown
      await page.click("text=Option-2"); // Select option
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("Custom Page");
      expect(route).toBe("Multiselect chosen");
      await page.click('[data-testid="dialog-rejection"]');

      //fallback route
      await page.click('[data-testid="test-preview"]');
      await page.fill('[data-testid="form-field-Test field"]', "fallback");
      await page.click('[data-testid="test-routing"]');
      routingType = await page.locator('[data-testid="test-routing-result-type"]').innerText();
      route = await page.locator('[data-testid="test-routing-result"]').innerText();
      expect(routingType).toBe("Custom Page");
      expect(route).toBe("Fallback Message");
    });
  });

  test.describe("Form with Attribute Routing - Team Form", () => {
    test.beforeEach(async ({ page, users }) => {
      const userFixture = await users.create(
        { username: "routing-forms" },
        {
          hasTeam: true,
          isOrg: true,
          hasSubteam: true,
          schedulingType: SchedulingType.ROUND_ROBIN,
        }
      );

      const orgMembership = await userFixture.getOrgMembership();

      const createdAttribute = await prisma.attribute.create({
        data: {
          teamId: orgMembership.teamId,
          type: AttributeType.SINGLE_SELECT,
          name: "Company Size",
          slug: `company-size-orgId-${orgMembership.teamId}`,
          options: {
            create: [
              {
                slug: "large",
                value: "large",
              },
              {
                slug: "medium",
                value: "medium",
              },
              {
                slug: "small",
                value: "small",
              },
            ],
          },
        },
        include: {
          options: true,
        },
      });

      await prisma.attributeToUser.create({
        data: {
          member: {
            connect: {
              userId_teamId: {
                userId: userFixture.id,
                teamId: orgMembership.teamId,
              },
            },
          },
          attributeOption: {
            connect: {
              id: createdAttribute.options[0].id,
            },
          },
        },
      });
      await userFixture.apiLogin();
    });

    test.afterEach(async ({ users }) => {
      // This also delete forms on cascade
      await users.deleteAll();
    });

    test("should be able to add attribute routing to a newly created team form", async ({ page }) => {
      const formId = await addForm(page, {
        forTeam: true,
      });

      await addShortTextFieldAndSaveForm({
        page,
        formId,
      });

      await page.click('[href*="/route-builder/"]');
      await selectNewRoute(page);
      // This would select Round Robin event that we created above
      await selectFirstEventRedirectOption(page);
      await addAttributeRoutingRule(page);
      await saveCurrentForm(page);

      await (async function testPreviewWhereThereIsMatch() {
        await page.click('[data-testid="test-preview"]');
        await page.fill('[data-testid="form-field-short-text"]', "large");
        await page.click('[data-testid="test-routing"]');
        await page.waitForSelector("text=@example.com");
        await page.click('[data-testid="dialog-rejection"]');
      })();

      await (async function testPreviewWhereThereIsNoMatch() {
        await page.click('[data-testid="test-preview"]');
        await page.fill('[data-testid="form-field-short-text"]', "medium");
        await page.click('[data-testid="test-routing"]');
        await page.waitForSelector("text=Attribute logic matched: No");
        await page.waitForSelector("text=Attribute logic fallback matched: Yes");
        await page.waitForSelector(
          "text=All assigned members of the team event type. Consider adding some attribute rules to fallback."
        );
        await page.click('[data-testid="dialog-rejection"]');
      })();
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

  await (async function firstResponse() {
    await page.fill('[data-testid="form-field-Test field"]', "event-routing");
    await fillAllOptionsBasedFields();
    page.click('button[type="submit"]');

    await page.waitForURL((url) => {
      return url.pathname.endsWith("/pro/30min");
    });
  })();

  await gotoRoutingLink({ page, formId: routingFormId });
  await (async function secondResponse() {
    await page.fill('[data-testid="form-field-Test field"]', "external-redirect");
    await fillAllOptionsBasedFields();
    page.click('button[type="submit"]');
    await page.waitForURL((url) => {
      return url.hostname.includes("cal.com");
    });
  })();

  await gotoRoutingLink({ page, formId: routingFormId });
  await (async function thirdResponse() {
    await page.fill('[data-testid="form-field-Test field"]', "custom-page");
    await fillAllOptionsBasedFields();
    page.click('button[type="submit"]');
    await expect(page.locator("text=Custom Page Result")).toBeVisible();
  })();

  async function fillAllOptionsBasedFields() {
    await selectInteractions.chooseOption({
      selector: `[data-testid="form-field-${Identifiers.multiNewFormat}"]`,
      optionText: "Option-2",
      page,
    });
    await selectInteractions.chooseOption({
      selector: `[data-testid="form-field-${Identifiers.multi}"]`,
      optionText: "Option-2",
      page,
    });
    await selectInteractions.chooseOption({
      selector: `[data-testid="form-field-${Identifiers.selectNewFormat}"]`,
      optionText: "Option-2",
      page,
    });
    await selectInteractions.chooseOption({
      selector: `[data-testid="form-field-${Identifiers.select}"]`,
      optionText: "Option-2",
      page,
    });
  }
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

    if (fieldTypeLabel === "Multiple Selection" || fieldTypeLabel === "Single Selection") {
      await page.fill(`[data-testid="fields.${nth}.options.0-input"]`, "123");
      await page.fill(`[data-testid="fields.${nth}.options.1-input"]`, "456");
      await page.fill(`[data-testid="fields.${nth}.options.2-input"]`, "789");
      await page.fill(`[data-testid="fields.${nth}.options.3-input"]`, "10-11-12");
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

async function addShortTextFieldAndSaveForm({ page, formId }: { page: Page; formId: string }) {
  await page.goto(`apps/routing-forms/form-edit/${formId}`);
  await page.click('[data-testid="add-field"]');
  await page.locator(".data-testid-field-type").nth(0).click();
  await page.fill(`[name="fields.0.label"]`, "Short Text");
  await page.fill(`[name="fields.0.identifier"]`, "short-text");
  await saveCurrentForm(page);
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

export async function selectOptionUsingLocator({ locator, option }: { locator: Locator; option: number }) {
  await locator.click();
  await locator
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
