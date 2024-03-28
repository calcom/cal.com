import { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

const BASE_URL = "https://i.cal.com";

async function expectPageStatusToBe200(page: Page, url: string) {
  const response = await page.goto(url);
  expect(response?.status()).toBe(200);
}

async function expectElementToBeVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

test.describe("Org", () => {
  test.describe("Embeds - i.cal.com", () => {
    const embedUrls = [
      "/embed",
      "/peer/embed",
      "/peer/meet/embed",
      "/sales/embed",
      "/sales/hipaa/embed",
    ];

    for (const embedUrl of embedUrls) {
      test(`Org ${embedUrl} should be embeddable`, async ({ page }) => {
        const url = `${BASE_URL}${embedUrl}`;
        await expectPageStatusToBe200(page, url);
        await expectPageToBeRenderedWithEmbedSsr(page);
      });
    }
  });

  test.describe("Dynamic Group Booking", () => {
    test("Dynamic Group booking link should load", async ({ page }) => {
      const users = [
        { username: "peer", name: "Peer Richelsen" },
        { username: "bailey", name: "Bailey Pumfleet" },
      ];

      const url = `${BASE_URL}/${users[0].username}+${users[1].username}`;
      await expectPageStatusToBe200(page, url);
      
      await expectElementToBeVisible(page, '[data-testid="event-title"]');
      await expectElementToBeVisible(page, '[data-testid="event-meta"]');
    });
  });

  test("Organization Homepage - Has Engineering and Marketing Teams", async ({ page }) => {
    const url = `${BASE_URL}`;
    await expectPageStatusToBe200(page, url);
    await expectElementToBeVisible(page, "text=Cal.com");
    await expectElementToBeVisible(page, "text=Engineering");
    await expectElementToBeVisible(page, "text=Marketing");
  });

  test.describe("Browse the Engineering Team", async () => {
    const engineeringUrls = ["/team/engineering", "/engineering"];

    for (const engineeringUrl of engineeringUrls) {
      test(`By ${engineeringUrl}`, async ({ page }) => {
        const url = `${BASE_URL}${engineeringUrl}`;
        await expectPageStatusToBe200(page, url);
        await expectElementToBeVisible(page, "text=Cal.com Engineering");
      });
    }
  });
});

async function expectPageToBeRenderedWithEmbedSsr(page: Page) {
  const isEmbed = await page.evaluate(() => {
    //@ts-expect-error - __NEXT_DATA__ is a global variable defined by Next.js
    return window.__NEXT_DATA__.props.pageProps.isEmbed;
  });

  expect(isEmbed).toBe(true);
}

