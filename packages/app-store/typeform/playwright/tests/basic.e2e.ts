import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import {
  addForm as addRoutingForm,
  addOneFieldAndDescriptionAndSaveForm,
} from "@calcom/app-store/routing-forms/playwright/tests/testUtils";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { test } from "@calcom/web/playwright/lib/fixtures";

const installApps = async (page: Page, users: Fixtures["users"]) => {
  const user = await users.create(
    { username: "routing-forms" },
    {
      hasTeam: true,
    }
  );
  await user.apiLogin();
  await page.goto(`/apps/typeform`);
  await page.click('[data-testid="install-app-button"]');
  (await page.waitForSelector('[data-testid="install-app-button-personal"]')).click();
  await page.waitForURL((url) => url.pathname === `/apps/typeform/how-to-use`);
};

test.describe("Typeform App", () => {
  test.afterEach(async ({ users }) => {
    // This also delete forms on cascade
    await users.deleteAll();
  });

  test.describe("Typeform Redirect Link", () => {
    test("should copy link in editing area", async ({ page, context, users }) => {
      await installApps(page, users);
      context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await page.goto(`/routing-forms/forms`);
      const formId = await addRoutingForm(page);
      await addOneFieldAndDescriptionAndSaveForm(formId, page, {
        description: "",
        field: { label: "test", typeIndex: 1 },
      });

      await page.click('[data-testid="form-dropdown"]');
      await page.click('[data-testid="copy-redirect-url"]');
      const text = await page.evaluate(async () => {
        return navigator.clipboard.readText();
      });
      expect(text).toBe(`${WEBAPP_URL}/router?form=${formId}&test={Recalled_Response_For_This_Field}`);
    });

    test("should copy link in RoutingForms list", async ({ page, context, users }) => {
      await installApps(page, users);
      context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await page.goto("/routing-forms/forms");
      const formId = await addRoutingForm(page);
      await addOneFieldAndDescriptionAndSaveForm(formId, page, {
        description: "",
        field: { label: "test", typeIndex: 1 },
      });

      await page.goto("/routing-forms/forms");
      await page.click('[data-testid="form-dropdown"]');
      await page.click('[data-testid="copy-redirect-url"]');
      const text = await page.evaluate(async () => {
        return navigator.clipboard.readText();
      });
      expect(text).toBe(`${WEBAPP_URL}/router?form=${formId}&test={Recalled_Response_For_This_Field}`);
    });
  });
});
