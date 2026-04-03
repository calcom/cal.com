import { test, expect } from "@playwright/test";

import {
  cleanupUser,
  TEST_PASSWORD,
  continueWithCalButton,
  openOnboardingEmbed,
  closeIframe,
  closeIframeAndClearCookies,
  onboardingDialog,
  getIframeSrc,
  signUp,
  reopenAndLogin,
  waitForPersonalSettings,
  completePersonalSettings,
  skipCalendarStep,
  waitForAuthorizeStep,
  clickAllow,
} from "./helpers";

const ROUTE = "/e2e/onboarding-with-hook";

test.describe("Onboarding With Hook", () => {
  test("renders trigger button and opens dialog with correct iframe params", async ({ page }) => {
    await page.goto(ROUTE);
    await expect(continueWithCalButton(page)).toBeVisible();
    await openOnboardingEmbed(page);

    const src = await getIframeSrc(page);
    expect(src).toBeTruthy();
    expect(src).toContain("/api/onboarding-embed/verify");
    expect(src).toContain("client_id=");
    expect(src).toContain("scope=");
    expect(src).toContain("state=");
    expect(src).toContain("redirect_uri=");
    expect(src).toContain("theme=dark");
  });

  test("closes dialog when dismissed", async ({ page }) => {
    await page.goto(ROUTE);
    await openOnboardingEmbed(page);
    await closeIframe(page);
  });

  test.describe("Full Flow — PostMessage Mode (onSuccess)", () => {
    const user = { email: "bob-fullflow-hook@test.com", name: "BobFullflowHook", username: "bobfullflowhook" };

    test.beforeAll(async () => await cleanupUser(user.email));
    test.afterAll(async () => await cleanupUser(user.email));

    test("signup → onboarding → authorize → onSuccess callback receives auth code, re-opening shows authorize again", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.goto(ROUTE);

      let frame = await signUp(page, user, TEST_PASSWORD);

      await waitForPersonalSettings(frame);
      await completePersonalSettings(frame, { name: user.name, bio: "PostMessage mode test bio" });
      await skipCalendarStep(frame);

      await waitForAuthorizeStep(frame);
      let dialogPromise = page.waitForEvent("dialog", { timeout: 30_000 });
      await clickAllow(frame);

      let alertDialog = await dialogPromise;
      expect(alertDialog.message()).toContain("Auth code:");
      await alertDialog.accept();
      await expect(onboardingDialog(page)).not.toBeVisible({ timeout: 10_000 });

      // Re-opening embed after authorize should show authorize again
      frame = await openOnboardingEmbed(page);
      await waitForAuthorizeStep(frame);

      dialogPromise = page.waitForEvent("dialog", { timeout: 30_000 });
      await clickAllow(frame);

      alertDialog = await dialogPromise;
      expect(alertDialog.message()).toContain("Auth code:");
      await alertDialog.accept();
      await expect(onboardingDialog(page)).not.toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Onboarding Resumability", () => {
    const user = { email: "bob-resume-hook@test.com", name: "BobResumeHook", username: "bobresumehook" };

    test.beforeAll(async () => await cleanupUser(user.email));
    test.afterAll(async () => await cleanupUser(user.email));

    test("close at profile → reopen resumes at profile → skip calendar → authorize fires onSuccess", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.goto(ROUTE);

      let frame = await signUp(page, user, TEST_PASSWORD);
      await waitForPersonalSettings(frame);
      await closeIframe(page);

      frame = await openOnboardingEmbed(page);
      await waitForPersonalSettings(frame);
      await completePersonalSettings(frame, { name: user.name, bio: "resume hook test bio" });
      await skipCalendarStep(frame);

      await waitForAuthorizeStep(frame);
      const dialogPromise = page.waitForEvent("dialog", { timeout: 30_000 });
      await clickAllow(frame);

      const alertDialog = await dialogPromise;
      expect(alertDialog.message()).toContain("Auth code:");
      await alertDialog.accept();
      await expect(onboardingDialog(page)).not.toBeVisible({ timeout: 10_000 });
    });
  });
});
