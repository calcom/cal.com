import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

test.describe("Org", () => {
  // Because these pages involve next.config.js rewrites, it's better to test them on production
  test.describe("Embeds - i.cal.com", () => {
    test("Org Profile Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/embed");
      expect(response?.status()).toBe(200);
      await page.screenshot({ path: "screenshot.jpg" });
      await expectPageToBeRenderedWithEmbedSsr(page);
    });

    test("Org User(Peer) Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/peer/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Peer Richelsen")).toBeVisible();
      await expectPageToBeRenderedWithEmbedSsr(page);
    });

    test("Org User Event(peer/meet) Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/peer/meet/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
      await expectPageToBeRenderedWithEmbedSsr(page);
    });

    test("Org Team Profile(/sales) page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Cal.com Sales")).toBeVisible();
      await expectPageToBeRenderedWithEmbedSsr(page);
    });

    test("Org Team Event page(/sales/hippa) should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/hipaa/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
      await expectPageToBeRenderedWithEmbedSsr(page);
    });
  });

  test.describe("Dynamic Group Booking", () => {
    test("Dynamic Group booking link should load", async ({ page }) => {
      const users = [
        {
          username: "peer",
          name: "Peer Richelsen",
        },
        {
          username: "bailey",
          name: "Bailey Pumfleet",
        },
      ];
      const response = await page.goto(`http://i.cal.com/${users[0].username}+${users[1].username}`);
      expect(response?.status()).toBe(200);
      expect(await page.locator('[data-testid="event-title"]').textContent()).toBe("Group Meeting");

      expect(await page.locator('[data-testid="event-meta"]').textContent()).toContain(users[0].name);
      expect(await page.locator('[data-testid="event-meta"]').textContent()).toContain(users[1].name);
      // 2 users and 1 for the organization(2+1)
      expect((await page.locator('[data-testid="event-meta"] [data-testid="avatar"]').all()).length).toBe(3);
    });
  });

  test("Organization Homepage - Has Engineering and Marketing Teams", async ({ page }) => {
    const response = await page.goto("https://i.cal.com");
    expect(response?.status()).toBe(200);
    await expect(page.locator("text=Cal.com")).toBeVisible();
    await expect(page.locator("text=Engineering")).toBeVisible();
    await expect(page.locator("text=Marketing")).toBeVisible();
  });

  test.describe("Browse the Engineering Team", async () => {
    test("By User Navigation", async ({ page }) => {
      await page.goto("https://i.cal.com");
      await page.click('text="Engineering"');
      await expect(page.locator("text=Cal.com Engineering")).toBeVisible();
    });

    test("By /team/engineering", async ({ page }) => {
      await page.goto("https://i.cal.com/team/engineering");
      await expect(page.locator("text=Cal.com Engineering")).toBeVisible();
    });

    test("By /engineering", async ({ page }) => {
      await page.goto("https://i.cal.com/engineering");
      await expect(page.locator("text=Cal.com Engineering")).toBeVisible();
    });
  });
});

// This ensures that the route is actually mapped to a page that is using withEmbedSsr
async function expectPageToBeRenderedWithEmbedSsr(page: Page) {
  expect(
    await page.evaluate(() => {
      //@ts-expect-error - __NEXT_DATA__ is a global variable defined by Next.js
      return window.__NEXT_DATA__.props.pageProps.isEmbed;
    })
  ).toBe(true);
}
