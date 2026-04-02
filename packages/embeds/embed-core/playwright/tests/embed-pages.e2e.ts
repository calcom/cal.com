// eslint-disable-next-line no-restricted-imports
import { test } from "@calcom/web/playwright/lib/fixtures";
import { expect } from "@playwright/test";

import "../../src/types";

test.describe("Embed Pages", () => {
  test("Event Type Page: should not have margin top on embed page", async ({ page }) => {
    await page.goto("http://localhost:3000/free/30min/embed");
    // Checks the margin from top by checking the distance between the div inside main from the viewport
    const marginFromTop = await page.evaluate(async () => {
      return await new Promise<{
        bookerContainer: number;
        mainEl: number;
      }>((resolve) => {
        (function tryGettingBoundingRect() {
          const mainElement = document.querySelector(".main");
          const bookerContainer = document.querySelector('[data-testid="booker-container"]');

          if (mainElement && bookerContainer) {
            // This returns the distance of the div element from the viewport
            const mainElBoundingRect = mainElement.getBoundingClientRect();
            const bookerContainerBoundingRect = bookerContainer.getBoundingClientRect();
            resolve({ bookerContainer: bookerContainerBoundingRect.top, mainEl: mainElBoundingRect.top });
          } else {
            setTimeout(tryGettingBoundingRect, 500);
          }
        })();
      });
    });

    expect(marginFromTop.bookerContainer).toBe(0);
    expect(marginFromTop.mainEl).toBe(0);
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

  test.describe("isEmbed, getEmbedNamespace, getEmbedTheme testing", () => {
    test("when `window.name` is set to 'cal-embed=' and `theme` is supplied as a query param", async ({
      page,
    }) => {
      const queryParamTheme = "dark";
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });

      await page.goto(`http://localhost:3000/free/30min?theme=${queryParamTheme}`);

      const isEmbed = await page.evaluate(() => {
        return window?.isEmbed?.();
      });

      const embedNamespace = await page.evaluate(() => {
        return window?.getEmbedNamespace?.();
      });

      expect(embedNamespace).toBe("");
      expect(isEmbed).toBe(true);
      const embedTheme = await page.evaluate(() => {
        return window?.getEmbedTheme?.();
      });
      expect(embedTheme).toBe(queryParamTheme);
      const embedStoreTheme = await page.evaluate(() => {
        return window.CalEmbed.embedStore.theme;
      });
      // Verify that the theme is set on embedStore.
      expect(embedStoreTheme).toBe(queryParamTheme);
    });

    test("when `window.name` does not contain `cal-embed=`", async ({ page }) => {
      await page.evaluate(() => {
        window.name = "testing";
      });
      await page.goto(`http://localhost:3000/free/30min`);
      const isEmbed = await page.evaluate(() => {
        return window?.isEmbed?.();
      });
      const embedNamespace = await page.evaluate(() => {
        return window?.getEmbedNamespace?.();
      });
      expect(isEmbed).toBe(false);
      expect(embedNamespace).toBe(null);
    });

    test("`getEmbedTheme` should use `window.CalEmbed.embedStore.theme` instead of `theme` query param if set", async ({
      page,
    }) => {
      const theme = "dark";
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });
      await page.goto("http://localhost:3000/free/30min?theme=dark");
      let embedTheme = await page.evaluate(() => {
        return window?.getEmbedTheme?.();
      });
      expect(embedTheme).toBe(theme);

      // Fake a scenario where theme query param is lost during navigation
      await page.evaluate(() => {
        history.pushState({}, "", "/free/30min");
      });

      embedTheme = await page.evaluate(() => {
        return window?.getEmbedTheme?.();
      });

      // Theme should still remain same as it's read from `window.CalEmbed.embedStore.theme` which is updated by getEmbedTheme itself
      expect(embedTheme).toBe(theme);
    });
  });

  test.describe("useSlotsViewOnSmallScreen", () => {
    test("should enable slots view on small screen when parameter is 'true'", async ({ page }) => {
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });
      await page.goto("http://localhost:3000/free/30min/embed?useSlotsViewOnSmallScreen=true");

      const useSlotsViewOnSmallScreen = await page.evaluate(() => {
        return window.CalEmbed?.embedStore?.uiConfig?.useSlotsViewOnSmallScreen;
      });

      expect(useSlotsViewOnSmallScreen).toBe(true);
    });

    test("should default to false when parameter is not present", async ({ page }) => {
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });
      await page.goto("http://localhost:3000/free/30min/embed");

      const useSlotsViewOnSmallScreen = await page.evaluate(() => {
        return window.CalEmbed?.embedStore?.uiConfig?.useSlotsViewOnSmallScreen;
      });

      expect(useSlotsViewOnSmallScreen).toBe(false);
    });

    test("should be false when parameter is 'false'", async ({ page }) => {
      await page.evaluate(() => {
        window.name = "cal-embed=";
      });
      await page.goto("http://localhost:3000/free/30min/embed?useSlotsViewOnSmallScreen=false");

      const useSlotsViewOnSmallScreen = await page.evaluate(() => {
        return window.CalEmbed?.embedStore?.uiConfig?.useSlotsViewOnSmallScreen;
      });

      expect(useSlotsViewOnSmallScreen).toBe(false);
    });
  });
});
