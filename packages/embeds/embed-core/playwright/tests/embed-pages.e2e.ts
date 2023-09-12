import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

test.describe("Embed Pages", () => {
  test("Event Type Page: should not have margin top on embed page", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min/embed");
    // Checks the margin from top by checking the distance between the div inside main from the viewport
    const marginFromTop = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        (function tryGettingBoundingRect() {
          const mainElement = document.querySelector(".main");

          if (mainElement) {
            // This returns the distance of the div element from the viewport
            const mainElBoundingRect = mainElement.getBoundingClientRect();
            resolve(mainElBoundingRect.top);
          } else {
            setTimeout(tryGettingBoundingRect, 500);
          }
        })();
      });
    });

    expect(marginFromTop).toBe(0);
  });

  test("Event Type Page: should have margin top on non embed page", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min");

    // Checks the margin from top by checking the distance between the div inside main from the viewport
    const marginFromTop = await page.evaluate(() => {
      const mainElement = document.querySelector("main");
      const divElement = mainElement?.querySelector("div");

      if (mainElement && divElement) {
        // This returns the distance of the div element from the viewport
        const divRect = divElement.getBoundingClientRect();
        return divRect.top;
      }

      return null;
    });

    expect(marginFromTop).not.toBe(0);
  });

  test("should change to embed when window.name is changed to cal-embed=", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min");

    await page.evaluate(() => {
      window.name = "cal-embed=";
    });

    await page.reload();

    const isEmbed = await page.evaluate(() => {
      return window?.isEmbed?.();
    });
    expect(isEmbed).toBe(true);
  });

  test("should return false on isEmbed when window.name does not contain cal-embed=", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min");

    await page.evaluate(() => {
      window.name = "testing";
    });

    await page.reload();

    const isEmbed = await page.evaluate(() => {
      return window?.isEmbed?.();
    });
    expect(isEmbed).toBe(false);
  });

  test("should return 'testing' on getEmbedNamespace when window.name is changed to cal-embed=testing", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/free/30min");

    await page.evaluate(() => {
      window.name = "cal-embed=testing";
    });

    await page.reload();

    const embedNamespace = await page.evaluate(() => {
      return window?.getEmbedNamespace?.();
    });
    expect(embedNamespace).toBe("testing");
  });

  test("should return empty string on getEmbedNamespace when window.name is changed to cal-embed=", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/free/30min");

    await page.evaluate(() => {
      window.name = "cal-embed=";
    });

    await page.reload();

    const embedNamespace = await page.evaluate(() => {
      return window?.getEmbedNamespace?.();
    });
    expect(embedNamespace).toBe("");
  });
});
