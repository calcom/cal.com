import { test, expect } from "@playwright/test";

// You can override the default Playwright test timeout of 30s
// test.setTimeout(60_000);
test.describe("Org", () => {
  test.describe("Embeds", () => {
    test("Org Profile Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/embed");
      expect(response?.status()).toBe(200);
      await page.screenshot({ path: "screenshot.jpg" });
    });

    test("Org User Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/peer/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Peer Richelsen")).toBeVisible();
    });

    test("Org User Event Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/peer/meet/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
    });

    test("Org Team Profile page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Cal.com Sales")).toBeVisible();
    });

    test("Org Team Event page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/hipaa/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
    });
  });
});
