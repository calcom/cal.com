import { expect, test } from "@playwright/test";

test.describe("Org", () => {
  // Because these pages involve next.config.js rewrites, it's better to test them on production
  test.describe("Embeds - i.cal.com", () => {
    test("Org Profile Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/embed");
      expect(response?.status()).toBe(200);
      await page.screenshot({ path: "screenshot.jpg" });
      const body = await response?.text();
      await expectPageToBeRenderedWithEmbedSsr(body);
    });

    test("Org User(Rick) Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/team-rick/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Used by Checkly")).toBeVisible();
      const body = await response?.text();
      await expectPageToBeRenderedWithEmbedSsr(body);
    });

    test("Org User Event(/team-rick/test-event) Page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/team-rick/test-event/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
      const body = await response?.text();
      await expectPageToBeRenderedWithEmbedSsr(body);
    });

    test("Org Team Profile(/sales) page should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator("text=Cal.com Sales")).toBeVisible();
      const body = await response?.text();
      await expectPageToBeRenderedWithEmbedSsr(body);
    });

    test("Org Team Event page(/sales/hippa) should be embeddable", async ({ page }) => {
      const response = await page.goto("https://i.cal.com/sales/hipaa/embed");
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="decrementMonth"]')).toBeVisible();
      await expect(page.locator('[data-testid="incrementMonth"]')).toBeVisible();
      const body = await response?.text();
      await expectPageToBeRenderedWithEmbedSsr(body);
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

      expect(await page.locator('[data-testid="event-meta"]').textContent()).toContain(
        "Join us for a meeting with multiple people"
      );
      expect((await page.locator('[data-testid="event-meta"] [data-testid="avatar"]').all()).length).toBe(2);
    });
  });

  test("Organization Homepage - Has Engineering and Marketing Teams", async ({ page }) => {
    const response = await page.goto("https://i.cal.com");
    expect(response?.status()).toBe(200);
    // Somehow there are two Cal.com text momentarily, but shouldn't be the concern of this check
    await expect(page.locator("text=Cal.com").first()).toBeVisible();
    await expect(page.locator("text=Engineering")).toBeVisible();
    await expect(page.locator("text=Marketing")).toBeVisible();
  });

  test.describe("Browse the Engineering Team", async () => {
    test("By User Navigation", async ({ page }) => {
      const response = await page.goto("https://i.cal.com");
      await page.waitForLoadState("networkidle");
      expect(response?.status()).toBe(200);
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
async function expectPageToBeRenderedWithEmbedSsr(responseText: string | undefined) {
  expect(responseText).toContain('\\"isEmbed\\":true');
}
