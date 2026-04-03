import { test, expect } from "@playwright/test";

import {
  cleanupUser,
  TEST_PASSWORD,
  continueWithCalButton,
  openOnboardingEmbed,
  getIframeSrc,
  signUp,
  waitForPersonalSettings,
  completePersonalSettings,
  skipCalendarStep,
  waitForAuthorizeStep,
  clickAllow,
  onboardingDialog,
  findUserByEmail,
  findAccessCodeByUserId,
} from "./helpers";

const ROUTE = "/e2e/onboarding-with-pkce";

test.describe("Onboarding With PKCE (public client)", () => {
  test("iframe src includes code_challenge and code_challenge_method=S256", async ({ page }) => {
    await page.goto(ROUTE);
    await expect(continueWithCalButton(page)).toBeVisible();
    await openOnboardingEmbed(page);

    const src = await getIframeSrc(page);
    expect(src).toContain("code_challenge=");
    expect(src).toContain("code_challenge_method=S256");
  });

  test.describe("Full Flow — PKCE", () => {
    const user = { email: "bob-pkce@test.com", name: "BobPkce", username: "bobpkce" };

    test.beforeAll(async () => await cleanupUser(user.email));
    test.afterAll(async () => await cleanupUser(user.email));

    test("signup → onboarding → authorize with code_challenge → AccessCode row has codeChallenge stored", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.goto(ROUTE);

      const frame = await signUp(page, user, TEST_PASSWORD);

      await waitForPersonalSettings(frame);
      await completePersonalSettings(frame, { name: user.name, bio: "PKCE test bio" });
      await skipCalendarStep(frame);

      await waitForAuthorizeStep(frame);
      const dialogPromise = page.waitForEvent("dialog", { timeout: 30_000 });
      await clickAllow(frame);

      const alertDialog = await dialogPromise;
      await alertDialog.accept();

      await expect(onboardingDialog(page)).not.toBeVisible({ timeout: 10_000 });

      const dbUser = await findUserByEmail(user.email);
      expect(dbUser).toBeTruthy();

      const accessCode = await findAccessCodeByUserId(dbUser!.id);
      expect(accessCode).toBeTruthy();
      expect(accessCode!.codeChallenge).toBeTruthy();
      expect(accessCode!.codeChallengeMethod).toBe("S256");
    });
  });
});
