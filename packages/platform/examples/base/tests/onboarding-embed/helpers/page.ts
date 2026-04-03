import type { BrowserContext, FrameLocator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function continueWithCalButton(page: Page) {
  return page.locator('button[aria-label="Continue with Cal.com"]');
}

export function onboardingDialog(page: Page) {
  return page.locator('[role="dialog"]');
}

export async function openOnboardingEmbed(page: Page): Promise<FrameLocator> {
  await continueWithCalButton(page).click();
  const dialog = onboardingDialog(page);
  await expect(dialog).toBeVisible();

  const iframe = dialog.locator('iframe[title="Cal.com Onboarding"]');
  await expect(iframe).toBeVisible();
  return iframe.contentFrame();
}

export async function closeIframe(page: Page) {
  const dialog = onboardingDialog(page);
  await dialog.locator("button:has(svg)").first().click();
  await expect(dialog).not.toBeVisible();
}

export async function closeIframeAndClearCookies(page: Page, context: BrowserContext) {
  await closeIframe(page);
  await clearBrowserCookies(context);
}

export function getIframeSrc(page: Page) {
  return onboardingDialog(page).locator('iframe[title="Cal.com Onboarding"]').getAttribute("src");
}

export function dispatchCalMessage(page: Page, data: Record<string, unknown>) {
  return page.evaluate((d) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: d,
        origin: "http://localhost:3000",
      })
    );
  }, data);
}

export async function getErrorOutput(page: Page) {
  const el = page.locator("#error-output");
  await expect(el).not.toBeEmpty({ timeout: 5_000 });
  return JSON.parse((await el.textContent()) as string);
}

export async function getCloseOutput(page: Page) {
  const el = page.locator("#close-output");
  await expect(el).toHaveText("closed", { timeout: 5_000 });
}

export async function checkDeniedOutput(page: Page) {
  const el = page.locator("#denied-output");
  await expect(el).toHaveText("denied", { timeout: 5_000 });
}

export async function clearBrowserCookies(context: BrowserContext) {
  await context.clearCookies();
}
