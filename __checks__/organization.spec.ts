import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

test.describe("Org", () => {
  // Because these pages involve next.config.js rewrites, it's better to test them on production
  test.describe("Embeds - i.cal.com", () => {
    test("Org Profile Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/embed");
      expect(response?.status()).toBe(200);
      await page.screenshot({ path: "screenshot.jpg" });
      await expectPageToBeServerSideRendered(page);
    });

    test("Org User(Peer) Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/peer/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Peer Richelsen")).toBeVisible();
      await expectPageToBeServerSideRendered(page);
    });

    test("Org User Event(peer/meet) Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/peer/meet/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
      await expectPageToBeServerSideRendered(page);
    });

    test("Org Team Profile(/sales) page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Cal.com Sales")).toBeVisible();
      await expectPageToBeServerSideRendered(page);
    });

    test("Org Team Event page(/sales/hippa) should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/hipaa/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
      await expectPageToBeServerSideRendered(page);
    });
  });
});

// This ensures that the route is actually mapped to a page that is using withEmbedSsr
async function expectPageToBeServerSideRendered(page: Page) {
  expect(
    await page.evaluate(() => {
      return window.__NEXT_DATA__.props.pageProps.isEmbed;
    })
  ).toBe(true);
}
