import { expect, test } from "@playwright/test";

import { hasIntegrationInstalled } from "../../../lib/integrations/getIntegrations";

test.describe.serial("Google calendar integration", () => {
  test.skip(
    !hasIntegrationInstalled("google_calendar"),
    "It should only run if Google Calendar is installed"
  );

  test.describe.serial("Google Calendar integration dashboard", () => {
    test.use({ storageState: "playwright/artifacts/proStorageState.json" });
    test("Can add Google Calendar integration", async ({ browser }) => {
      const context = await browser.newContext({ locale: "en-US" });

      const page = await context.newPage();

      await page.goto("/integrations");

      page.waitForNavigation();

      /** We should see the "Connect" button for Google Calendar */
      expect(page.locator(`li:has-text("Google Calendar") >> [data-testid="integration-connection-button"]`))
        .toContainText("Connect")
        .catch(() => {
          console.error(
            `Make sure Google Calendar it's properly installed and that an integration hasn't been already added.`
          );
        });

      await Promise.all([
        page.waitForNavigation({ url: "https://accounts.google.com/o/oauth2/v2/auth/identifier?*" }),
        page.click('li:has-text("Google Calendar") >> [data-testid="integration-connection-button"]'),
      ]);

      await page.fill('[id="identifierId"]', "appstest647@gmail.com");

      await Promise.all([
        page.waitForNavigation({ url: "https://accounts.google.com/signin/v2/challenge/pwd?*" }),
        page.press('[id="identifierId"]', "Enter"),
      ]);

      await page.fill('[type="password"]', "aW4TDL9GQ55_01");

      // Press Enter
      await Promise.all([
        page.waitForNavigation({ url: "https://accounts.google.com/signin/oauth/v2/consentsummary?*" }),
        page.press('[type="password"]', "Enter"),
      ]);

      // When connecting an account for the first time, you need to check some chekboxes
      // await page.check('[type="checkbox"]');

      await Promise.all([
        page.waitForNavigation({ url: "/integrations" }),
        page.click('[id="submit_approve_access"]:has(button)'),
      ]);

      page.waitForEvent("load");

      /** If Google Calendar is added correctly we should see the "Disconnect" button */
      expect(
        page.locator(
          `div:has-text("Calendars") + li:has-text("Google Calendar") >> [data-testid="integration-connection-button"]`
        )
      ).toContainText("Disconnect");
    });
  });
});
