import { test } from "@playwright/test";

// Using logged in state from globalSteup
test.use({ storageState: "proStorageState.json" });

test("login with pro@example.com", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Try to go homepage
  await page.goto("http://localhost:3000/");
  // It should redirect you to the event-types page
  await page.waitForSelector("[data-testid=event-types]");

  await context.close();
});
