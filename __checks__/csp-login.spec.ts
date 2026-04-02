import process from "node:process";
import { expect, test } from "@playwright/test";

test.describe("CSP Headers", () => {
  test("Login page should have CSP header with nonce", async ({ page }) => {
    const targetUrl = process.env.ENVIRONMENT_URL || "https://app.cal.com";

    const response = await page.goto(`${targetUrl}/auth/login`);

    expect(response?.status()).toBe(200);

    const cspHeader = response?.headers()["content-security-policy"];
    expect(cspHeader).toBeTruthy();

    // Verify nonce is present in CSP header
    const nonceMatch = cspHeader?.match(/'nonce-([^']+)'/);
    expect(nonceMatch).toBeTruthy();
    expect(nonceMatch![1]).toHaveLength(24);
    expect(nonceMatch![1]).toMatch(/==$/);

    await page.screenshot({ path: "screenshot.jpg" });
  });
});
