import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

test.describe("Preview", () => {
  test("Preview - embed-core should load if correct embedLibUrl is provided", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/embed/preview.html?embedLibUrl=http://localhost:3000/embed/embed.js&bookerUrl=http://localhost:3000&calLink=pro/30min"
    );
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

  test("Preview - embed-core should load from embedLibUrl", async ({ page }) => {
    // Intentionally pass a URL that will not load to be able to easily test that the embed was loaded from there
    page.goto(
      "http://localhost:3000/embed/preview.html?embedLibUrl=http://localhost:3000/embed/embed-not-found.js&bookerUrl=http://localhost:3000&calLink=pro/30min"
    );

    const failedRequestUrl = await new Promise<string>((resolve) =>
      page.on("requestfailed", (request) => {
        console.log("request failed");
        resolve(request.url());
      })
    );

    expect(failedRequestUrl).toBe("http://localhost:3000/embed/embed-not-found.js");
  });
});
