import { test, expect } from "@playwright/test";

import {
  cleanupUser,
  TEST_PASSWORD,
  TEST_BIO,
  APPLE_ID,
  APPLE_PASSWORD,
  openOnboardingEmbed,
  closeIframe,
  closeIframeAndClearCookies,
  signUp,
  reopenAndLogin,
  waitForPersonalSettings,
  completePersonalSettings,
  waitForCalendarStep,
  connectAppleCalendar,
  clickCalendarContinue,
  skipCalendarStep,
  waitForAuthorizeStep,
  verifyScopePermissionsVisible,
  clickAllow,
  findUserByEmail,
  findAppleCalendarCredential,
} from "./helpers";

const ROUTE = "/e2e/onboarding-with-redirect";

function expectRedirectWithAuthCode(page: import("@playwright/test").Page) {
  return page.waitForURL(/[?&](code|error)=/, { timeout: 30_000 }).then(() => {
    const redirectUrl = new URL(page.url());
    const error = redirectUrl.searchParams.get("error");
    expect(error, `Expected no error in redirect, but got: ${error}`).toBeNull();
    expect(redirectUrl.searchParams.get("code")).toBeTruthy();
    expect(redirectUrl.searchParams.get("state")).toBeTruthy();
  });
}

test.describe("Onboarding With Redirect", () => {
  const user = { email: "bob-redirect@test.com", name: "BobRedirect", username: "bobredirect100" };

  test.beforeAll(async () => await cleanupUser(user.email));
  test.afterAll(async () => await cleanupUser(user.email));

  test("signup → onboarding → calendar → authorize → redirect with auth code", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.goto(ROUTE);

    const frame = await signUp(page, user, TEST_PASSWORD);

    await waitForPersonalSettings(frame);
    const dbUser = await findUserByEmail(user.email);
    expect(dbUser).toBeTruthy();
    expect(dbUser!.username).toBe(user.username);

    await completePersonalSettings(frame, { name: user.name, bio: TEST_BIO });

    await waitForCalendarStep(frame);
    const updatedUser = await findUserByEmail(user.email);
    expect(updatedUser!.name).toBe(user.name);
    expect(updatedUser!.username).toBe(user.username);
    expect(updatedUser!.bio).toBe(TEST_BIO);

    if (APPLE_ID && APPLE_PASSWORD) {
      await connectAppleCalendar(frame, context, { appleId: APPLE_ID, applePassword: APPLE_PASSWORD });

      const credential = await findAppleCalendarCredential(dbUser!.id);
      expect(credential).toBeTruthy();
      expect(credential!.type).toBe("apple_calendar");
    }

    await clickCalendarContinue(frame);

    await waitForAuthorizeStep(frame);
    await verifyScopePermissionsVisible(frame);
    await clickAllow(frame);

    await expectRedirectWithAuthCode(page);

    // Re-opening embed after authorize should show authorize again and redirect
    await page.goto(ROUTE);
    const reopenFrame = await openOnboardingEmbed(page);
    await waitForAuthorizeStep(reopenFrame);
    await clickAllow(reopenFrame);

    await expectRedirectWithAuthCode(page);
  });

  test.describe("Onboarding Resumability", () => {
    const resumeUser = { email: "bob-resume-redir@test.com", name: "BobResumeRedir", username: "bobresumeredir" };

    test.beforeAll(async () => await cleanupUser(resumeUser.email));
    test.afterAll(async () => await cleanupUser(resumeUser.email));

    test("close at profile → reopen resumes at profile → skip calendar → authorize redirects", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.goto(ROUTE);

      let frame = await signUp(page, resumeUser, TEST_PASSWORD);
      await waitForPersonalSettings(frame);
      await closeIframe(page);

      frame = await openOnboardingEmbed(page);
      await waitForPersonalSettings(frame);
      await completePersonalSettings(frame, { name: resumeUser.name, bio: "resume test bio" });
      await skipCalendarStep(frame);

      await waitForAuthorizeStep(frame);
      await clickAllow(frame);

      await expectRedirectWithAuthCode(page);
    });
  });
});
