import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

test("Preview - embed-core should load", async ({ page }) => {
  await page.goto("http://localhost:3000/embed/preview.html");
  const libraryLoaded = await page.evaluate(() => {
    return new Promise((resolve) => {
      setInterval(() => {
        if (
          (
            window as unknown as {
              Cal: {
                __css: string;
              };
            }
          ).Cal.__css
        ) {
          resolve(true);
        }
      }, 1000);
    });
  });
  expect(libraryLoaded).toBe(true);
});
