import { WEBAPP_URL } from "@calcom/lib/constants";
import { test } from "@calcom/web/playwright/lib/fixtures";

test.use({ userAgent: "GCal Testing" });

test.describe("Google Calendar", async () => {
  let user;
  // let page: Page;
  // let browser;

  // const browser = await chromium.launch();
  // const context = await browser.newContext();
  // const page = await context.newPage();

  test.beforeEach(async ({ page, users }) => {
    user = await users.create();
    await user.apiLogin();

    const response = await fetch(`${WEBAPP_URL}/api/integrations/googlecalendar/add`);

    await page.goto((await response.json()).url);

    await page.getByRole("textbox", { name: "Email or phone" }).fill("calcom.test.qa.1@gmail.com");
    await page.click("text=Next");

    await page.getByRole("textbox", { name: "Enter your password" }).fill("T6tgSc49RCjZ8w");
    await page.click("text=Next");

    await page.waitForSelector("button:enabled");

    // Need to account for all the different versions of the OAuth screen
    /* eslint-disable */
    if (await page.$("text=Continue")) {
      await page.click("text=Continue");
    } else if (await page.$("text=Allow")) {
      await page.waitForSelector("text=Allow");
      await page.click("id=submit_approve_access");
    }

    if (await page.$("text=Select all")) {
      await page.check("text=Select all");
      await page.click("text=Continue");
    }

    await page.waitForTimeout(50000);
  });

  test("Should be able to connect calendar", async ({ page, users }) => {
    await page.goto("/event-types");
    await page.waitForTimeout(50000);
  });
});
