import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { authenticator } from "otplib";

import { symmetricDecrypt } from "@calcom/lib/crypto";
import { totpAuthenticatorCheck } from "@calcom/lib/totp";
import { prisma } from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

// TODO: add more backup code tests, e.g. login + disabling 2fa with backup

// a test to logout requires both a successful login as logout, to prevent
// a doubling of tests failing on logout & logout, we can group them.
test.describe("2FA Tests", async () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("should allow a user to enable 2FA and login using 2FA", async ({ page, users, browser }) => {
    // log in trail user
    const user = await test.step("Enable 2FA", async () => {
      const user = await users.create();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const userPassword = user.username!;
      await user.apiLogin();

      // expects the home page for an authorized user
      await page.goto("/settings/security/two-factor-auth");
      await page.click(`[data-testid=two-factor-switch]`);
      await page.fill('input[name="password"]', userPassword);
      await page.press('input[name="password"]', "Enter");
      const secret = await page.locator(`[data-testid=two-factor-secret]`).textContent();
      expect(secret).toHaveLength(32);
      await page.click('[data-testid="goto-otp-screen"]');

      /**
       * Try a wrong code and test that wrong code is rejected.
       */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await fillOtp({ page, secret: "123456", noRetry: true });
      await expect(page.locator('[data-testid="error-submitting-code"]')).toBeVisible();

      await removeOtpInput(page);

      await fillOtp({
        page,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        secret: secret!,
      });

      await expect(page.getByTestId("backup-codes-download")).toBeVisible();

      return user;
    });

    await test.step("Logout", async () => {
      await users.logout();
    });

    await test.step("Login with 2FA enabled", async () => {
      const [secondContext, secondPage] = await user.loginOnNewBrowser(browser);
      const userWith2FaSecret = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });

      const secret = symmetricDecrypt(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userWith2FaSecret!.twoFactorSecret!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        process.env.CALENDSO_ENCRYPTION_KEY!
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await fillOtp({ page: secondPage, secret: secret! });
      await Promise.all([
        secondPage.press('input[name="2fa6"]', "Enter"),
        secondPage.waitForResponse("**/api/auth/callback/credentials**"),
      ]);
      const shellLocator = secondPage.locator(`[data-testid=dashboard-shell]`);
      await expect(shellLocator).toBeVisible();
      await secondContext.close();
    });
  });

  test("should allow a user to disable 2FA", async ({ page, users }) => {
    // log in trail user
    const user = await test.step("Enable 2FA", async () => {
      const user = await users.create();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const userPassword = user.username!;
      await user.apiLogin();

      // expects the home page for an authorized user
      await page.goto("/settings/security/two-factor-auth");
      await page.click(`[data-testid=two-factor-switch][data-state="unchecked"]`);
      await page.fill('input[name="password"]', userPassword);
      await page.press('input[name="password"]', "Enter");
      const secret = await page.locator(`[data-testid=two-factor-secret]`).textContent();
      expect(secret).toHaveLength(32);
      await page.click('[data-testid="goto-otp-screen"]');

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await fillOtp({ page, secret: secret! });

      // backup codes are now showing, so run a few tests

      // click download button
      const promise = page.waitForEvent("download");
      await page.getByTestId("backup-codes-download").click();
      const download = await promise;
      expect(download.suggestedFilename()).toBe("cal-backup-codes.txt");
      // TODO: check file content

      // click copy button
      await page.getByTestId("backup-codes-copy").click();
      await page.getByTestId("toast-success").waitFor();
      // TODO: check clipboard content

      // close backup code dialog
      await page.getByTestId("backup-codes-close").click();

      await expect(page.locator(`[data-testid=two-factor-switch][data-state="checked"]`)).toBeVisible();

      return user;
    });

    await test.step("Disable 2FA", async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const userPassword = user.username!;

      // expects the home page for an authorized user
      await page.goto("/settings/security/two-factor-auth");
      await page.click(`[data-testid=two-factor-switch][data-state="checked"]`);
      await page.fill('input[name="password"]', userPassword);

      const userWith2FaSecret = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
      });

      const secret = symmetricDecrypt(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userWith2FaSecret!.twoFactorSecret!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        process.env.CALENDSO_ENCRYPTION_KEY!
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await fillOtp({ page, secret: secret! });
      await page.click('[data-testid="disable-2fa"]');
      await expect(page.locator(`[data-testid=two-factor-switch][data-state="unchecked"]`)).toBeVisible();

      return user;
    });
  });
});

async function removeOtpInput(page: Page) {
  await page.locator('input[name="2fa6"]').waitFor({ state: "visible", timeout: 30_000 });

  // Remove one OTP input
  await page.locator('input[name="2fa6"]').focus();
  await page.keyboard.press("Backspace");
}

async function fillOtp({ page, secret, noRetry }: { page: Page; secret: string; noRetry?: boolean }) {
  let token = authenticator.generate(secret);
  if (!noRetry && !totpAuthenticatorCheck(token, secret)) {
    console.log("Token expired, Renerating.");
    // Maybe token was just about to expire, try again just once more
    token = authenticator.generate(secret);
  }
  await page.locator('input[name="2fa1"]').waitFor({ state: "visible", timeout: 60_000 });
  await page.fill('input[name="2fa1"]', token[0]);
  await page.fill('input[name="2fa2"]', token[1]);
  await page.fill('input[name="2fa3"]', token[2]);
  await page.fill('input[name="2fa4"]', token[3]);
  await page.fill('input[name="2fa5"]', token[4]);
  await page.fill('input[name="2fa6"]', token[5]);
}
