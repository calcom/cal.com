import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("VerifyCodeDialog OTP input (regression #28947)", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`typed digit stays readable in ${theme} theme`, async ({ page, users, prisma }) => {
      const user = await users.create();
      const eventType = await user.getFirstEventAsOwner();

      await prisma.eventType.update({
        where: { id: eventType.id },
        data: { requiresBookerEmailVerification: true },
      });

      // Emulate the opposite OS color scheme so the booker is forced into its
      // non-native mode — mirrors the embed scenario in #28947 where the
      // parent page's color-scheme fought the iframe's explicit theme and
      // caused -webkit-text-fill-color: currentColor to resolve to white.
      await page.emulateMedia({ colorScheme: theme === "light" ? "dark" : "light" });

      await page.goto(`/${user.username}/${eventType.slug}?theme=${theme}`);
      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.fill('[name="name"]', "Visibility Tester");
      await page.fill('[name="email"]', `visibility-${theme}@example.com`);
      await page.locator('[data-testid="confirm-book-button"]').click();

      const firstDigit = page.locator('input[name="2fa1"]');
      await firstDigit.waitFor({ state: "visible" });
      await firstDigit.fill("1");

      const { textFill, bg } = await firstDigit.evaluate((el) => {
        const s = getComputedStyle(el);
        return { textFill: s.webkitTextFillColor, bg: s.backgroundColor };
      });

      expect(textFill).not.toBe(bg);
    });
  }
});
