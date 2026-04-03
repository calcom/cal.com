import type { BrowserContext, FrameLocator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { openOnboardingEmbed } from "./page";

export async function waitForLoginForm(frame: FrameLocator) {
  await expect(frame.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 30_000 });
}

const signupEmailSelector = 'input[id="signup-email"]';

export async function navigateToSignup(frame: FrameLocator) {
  await frame.locator('a[href*="/signup"]').click();
  await expect(frame.locator('[data-testid="continue-with-email-button"]')).toBeVisible({
    timeout: 15_000,
  });
  await frame.locator('[data-testid="continue-with-email-button"]').click();
  try {
    await expect(frame.locator(signupEmailSelector)).toBeVisible({ timeout: 5_000 });
  } catch {
    await frame.locator('[data-testid="continue-with-email-button"]').click();
    await expect(frame.locator(signupEmailSelector)).toBeVisible({ timeout: 10_000 });
  }
}

export async function fillSignupFields(
  frame: FrameLocator,
  user: { email: string; username?: string }
) {
  const emailInput = frame.locator(signupEmailSelector);
  const currentEmail = await emailInput.inputValue();
  if (currentEmail !== user.email) {
    await emailInput.clear();
    await emailInput.fill(user.email);
  }
  if (user.username) {
    const usernameInput = frame.locator('input[name="username"]');
    const currentUsername = await usernameInput.inputValue();
    if (currentUsername !== user.username) {
      await usernameInput.clear();
      await usernameInput.fill(user.username);
    }
  }
}

export async function fillSignupPassword(frame: FrameLocator, password: string) {
  await frame.locator('input[id="signup-password"]').fill(password);
}

export async function submitSignup(frame: FrameLocator) {
  await frame.locator('[data-testid="signup-submit-button"]').click();
}

export async function completeSignup(
  frame: FrameLocator,
  user: { email: string; username?: string },
  password: string
) {
  await navigateToSignup(frame);
  await fillSignupFields(frame, user);
  await fillSignupPassword(frame, password);
  await submitSignup(frame);
}

export async function waitForPersonalSettings(frame: FrameLocator) {
  await expect(frame.locator('input[name="name"]')).toBeVisible({ timeout: 60_000 });
}

export async function verifyPersonalSettingsPrefill(
  frame: FrameLocator,
  user: { name: string; username: string }
) {
  await expect(frame.locator('input[name="name"]')).toHaveValue(user.name);
  await expect(frame.locator('[data-testid="username-input"]')).toHaveValue(user.username);
}

export async function fillBio(frame: FrameLocator, bio: string) {
  await frame.locator('textarea[name="bio"]').fill(bio);
}

export async function submitPersonalSettings(frame: FrameLocator) {
  await frame.locator('button[form="personal-settings-form"]').click();
}

export async function fillName(frame: FrameLocator, name: string) {
  const nameInput = frame.locator('input[name="name"]');
  await nameInput.clear();
  await nameInput.fill(name);
}

export async function completePersonalSettings(frame: FrameLocator, user: { name: string; bio: string }) {
  await fillName(frame, user.name);
  await fillBio(frame, user.bio);
  await submitPersonalSettings(frame);
}

export async function waitForCalendarStep(frame: FrameLocator) {
  await expect(frame.locator('[data-testid="onboarding-continue-btn"]')).toBeVisible({
    timeout: 30_000,
  });
}

export async function clickCalendarContinue(frame: FrameLocator) {
  await frame.locator('[data-testid="onboarding-continue-btn"]').click();
}

export async function connectAppleCalendar(
  frame: FrameLocator,
  context: BrowserContext,
  credentials: { appleId: string; applePassword: string }
) {
  const popupPromise = context.waitForEvent("page");

  await frame
    .locator("div")
    .filter({ hasText: "Apple Calendar" })
    .filter({ has: frame.locator("button") })
    .locator("button")
    .filter({ hasText: /connect/i })
    .first()
    .click();

  const popup = await popupPromise;
  await popup.waitForLoadState();

  await expect(popup.locator('[data-testid="apple-calendar-form"]')).toBeVisible({
    timeout: 15_000,
  });
  await popup.locator('[data-testid="apple-calendar-email"]').fill(credentials.appleId);
  await popup.locator('[data-testid="apple-calendar-password"]').fill(credentials.applePassword);
  await popup.locator('[data-testid="apple-calendar-login-button"]').click();

  await popup.waitForEvent("close", { timeout: 30_000 });

  await expect(
    frame.locator("div").filter({ hasText: "Apple Calendar" }).locator(':text("Connected")').first()
  ).toBeVisible({ timeout: 10_000 });
}

export async function waitForAuthorizeStep(frame: FrameLocator) {
  await expect(frame.locator('[data-testid="allow-button"]')).toBeVisible({ timeout: 30_000 });
}

export async function verifyScopePermissionsVisible(frame: FrameLocator) {
  await expect(frame.locator('[data-testid="scope-permissions-list"]')).toBeVisible();
}

export async function clickAllow(frame: FrameLocator) {
  const allowBtn = frame.locator('[data-testid="allow-button"]');
  await expect(allowBtn).toBeEnabled();
  await allowBtn.click();
}

export async function loginWithCredentials(
  frame: FrameLocator,
  credentials: { email: string; password: string }
) {
  await waitForLoginForm(frame);
  await frame.locator("input#email").fill(credentials.email);
  await frame.locator("input#password").fill(credentials.password);
  await frame.locator('[data-testid="login-form"] button[type="submit"]').click();
}

export async function signUp(
  page: Page,
  user: { email: string; username?: string },
  password: string
): Promise<FrameLocator> {
  const frame = await openOnboardingEmbed(page);
  await waitForLoginForm(frame);
  await completeSignup(frame, user, password);
  return frame;
}

export async function reopenAndLogin(
  page: Page,
  route: string,
  credentials: { email: string; password: string }
): Promise<FrameLocator> {
  await page.goto(route);
  const frame = await openOnboardingEmbed(page);
  await loginWithCredentials(frame, credentials);
  return frame;
}

export async function skipCalendarStep(frame: FrameLocator) {
  await waitForCalendarStep(frame);
  await clickCalendarContinue(frame);
}
