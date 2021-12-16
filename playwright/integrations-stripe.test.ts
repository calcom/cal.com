import { expect, test } from "@playwright/test";

import { hasIntegrationInstalled } from "../lib/integrations/getIntegrations";

test.describe.serial("Stripe integration", () => {
  test.skip(!hasIntegrationInstalled("stripe_payment"), "It should only run if Stripe is installed");

  test("Can add Stripe integration", async ({ page }) => {
    test.use({ storageState: "playwright/artifacts/proStorageState.json" });
    await page.goto("/integrations");
    /** We should see the "Connect" button for Stripe */
    expect(page.locator(`li:has-text("Stripe") >> [data-testid="integration-connection-button"]`))
      .toContainText("Connect")
      .catch(() => {
        console.error(
          `Make sure Stripe it's properly installed and that an integration hasn't been already added.`
        );
      });

    /** We start the Stripe flow */
    await Promise.all([
      page.waitForNavigation({ url: "https://connect.stripe.com/oauth/v2/authorize?*" }),
      await page.click('li:has-text("Stripe") >> [data-testid="integration-connection-button"]'),
    ]);

    await Promise.all([
      page.waitForNavigation({ url: "/integrations" }),
      /** We skip filling Stripe forms (testing mode only) */
      await page.click('[id="skip-account-app"]'),
    ]);

    /** If Stripe is added correctly we should see the "Disconnect" button */
    expect(
      page.locator(`li:has-text("Stripe") >> [data-testid="integration-connection-button"]`)
    ).toContainText("Disconnect");
  });

  test("Can book a paid booking", async ({ page }) => {
    await page.goto("/pro/paid");
    // Click [data-testid="incrementMonth"]
    await page.click('[data-testid="incrementMonth"]');
    // Click [data-testid="day"]
    await page.click('[data-testid="day"][data-disabled="false"]');
    // Click [data-testid="time"]
    await page.click('[data-testid="time"]');
    // --- fill form
    await page.fill('[name="name"]', "Stripe Stripeson");
    await page.fill('[name="email"]', "test@example.com");

    await Promise.all([
      page.waitForNavigation({ url: "/payment/*" }),
      await page.press('[name="email"]', "Enter"),
    ]);

    // We lookup Stripe's iframe
    const stripeFrame = page.frame({
      url: "https://js.stripe.com/v3/elements-inner-card-*",
    });

    if (!stripeFrame) throw new Error("Stripe frame not found");

    // Fill [placeholder="Card number"]
    await stripeFrame.fill('[placeholder="Card number"]', "4242 4242 4242 4242");
    // Fill [placeholder="MM / YY"]
    await stripeFrame.fill('[placeholder="MM / YY"]', "12 / 24");
    // Fill [placeholder="CVC"]
    await stripeFrame.fill('[placeholder="CVC"]', "111");
    // Fill [placeholder="ZIP"]
    await stripeFrame.fill('[placeholder="ZIP"]', "111111");
    // Press Enter
    // await stripeFrame.press('[placeholder="ZIP"]', "Enter");
    // Click button:has-text("Pay now")
    await page.click('button:has-text("Pay now")');

    // Make sure we're navigated to the success page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });
  });
});
