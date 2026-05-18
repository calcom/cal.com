import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, testEmail, testName } from "./lib/testUtils";

/**
 * Regression test for https://github.com/calcom/cal.diy/issues/28947
 *
 * When the embed is set to `theme: "light"` but hosted in a parent page with
 * `color-scheme: dark`, `currentColor` on `-webkit-text-fill-color` resolved to
 * white, making OTP digits invisible (white-on-white).
 *
 * Fix: digitClassName now uses `var(--cal-text-emphasis)` instead of `currentColor`.
 * The CSS variable is theme-aware and decoupled from the parent's color-scheme.
 */
test.describe("VerifyCodeDialog OTP digit visibility", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("digit inputs: -webkit-text-fill-color matches computed color in light theme", async ({
    page,
    users,
  }) => {
    // Create a user with a light booking-page theme and an event type that requires
    // email verification before booking.
    const user = await users.create({
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "Email Verify",
          slug: "email-verify",
          length: 30,
          requiresBookerEmailVerification: true,
        },
      ],
    });

    // Navigate to the booking page for the email-verification event type.
    // Simulate a dark color-scheme parent page — the exact context that caused #28947.
    // addInitScript persists across navigation and runs before page scripts,
    // simulating a host page with color-scheme: dark (the embed regression in #28947).
    await page.addInitScript(() => {
      document.documentElement.style.colorScheme = "dark";
    });
    await page.goto(`/${user.username}/email-verify`);
    await page.waitForLoadState("domcontentloaded");

    // Pick the first available slot.
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Fill in the booking form.
    await page.fill('[name="name"]', testName);
    await page.fill('[name="email"]', testEmail);

    // Submit the booking. Because requiresBookerEmailVerification is true this should
    // open the VerifyCodeDialog instead of navigating away to the success page.
    // Register the response listener BEFORE clicking so we never miss a fast response.
    const bookingResp = page.waitForResponse(
      (resp) => resp.url().includes("/api/book/event") && resp.status() === 200
    );
    await page.locator('[data-testid="confirm-book-button"]').click();
    // A non-200 or timeout here means the slot was unavailable or the form POST failed.
    await bookingResp;

    // Wait for the OTP dialog to appear (identified by the first digit input).
    const firstDigit = page.locator('[name="2fa1"]');
    await firstDigit.waitFor({ state: "visible" });

    // Assert: -webkit-text-fill-color must equal the computed text color.
    // Both values should come from --cal-text-emphasis, so they must be identical.
    // This rules out the white-on-white regression where -webkit-text-fill-color
    // resolved to the parent page's color-scheme color rather than the cal theme token.
    const { textFill, color, bg } = await firstDigit.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        textFill: s.webkitTextFillColor,
        color: s.color,
        bg: s.backgroundColor,
      };
    });

    // Strong assertion (recommended by CodeRabbit): the fill color must equal the
    // text color — both resolved from var(--cal-text-emphasis), not from currentColor.
    expect(textFill).toBe(color);
    // Guard against accidental transparent/same-as-background scenarios.
    expect(textFill).not.toBe(bg);
  });
});
