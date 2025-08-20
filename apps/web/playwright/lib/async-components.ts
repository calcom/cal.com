import type { Page } from "@playwright/test";

/**
 * E2E Test Utility for Async Component Loading
 *
 * Waits for dynamically loaded app components to be ready in E2E tests.
 * This is needed because Phase 2 dynamic loading makes components load asynchronously.
 */

/**
 * Wait for async app components to load on event type pages
 * @param page - Playwright page object
 * @param options - Configuration options
 */
export async function waitForAsyncAppComponents(
  page: Page,
  options: {
    /** Timeout in milliseconds (default: 10000) */
    timeout?: number;
    /** Specific app slug to wait for (e.g., 'stripe', 'paypal') */
    appSlug?: string;
    /** Wait for skeleton loading states to disappear */
    waitForSkeletonToDisappear?: boolean;
  } = {}
) {
  const { timeout = 10000, appSlug, waitForSkeletonToDisappear = true } = options;

  try {
    // Wait for the page to be in a stable state
    await page.waitForLoadState("networkidle", { timeout });

    // If we're waiting for skeleton to disappear, do that first
    if (waitForSkeletonToDisappear) {
      await page.waitForFunction(
        () => {
          // Look for loading skeletons and wait for them to disappear
          const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
          return skeletons.length === 0;
        },
        undefined,
        { timeout }
      );
    }

    // If a specific app is specified, wait for its specific elements
    if (appSlug === "stripe") {
      await page.waitForSelector('[data-testid="stripe-price-input"]', { timeout });
    } else if (appSlug === "paypal") {
      await page.waitForSelector('[data-testid*="paypal"]', { timeout });
    } else {
      // Generic wait for any app form elements to be ready
      await page.waitForFunction(
        () => {
          // Check if the event-type-form has been populated with app components
          const form = document.querySelector("#event-type-form");
          if (!form) return false;

          // Look for app-related switches or inputs that indicate components have loaded
          const appSwitches = form.querySelectorAll('[role="switch"]');
          const appInputs = form.querySelectorAll('input[data-testid*="-"], select[data-testid*="-"]');

          return appSwitches.length > 0 || appInputs.length > 0;
        },
        undefined,
        { timeout }
      );
    }

    // Additional small wait to ensure components are fully interactive
    await page.waitForFunction(() => true, undefined, { timeout: 100 });
  } catch (error) {
    console.warn(`Warning: Timeout waiting for async app components to load: ${error}`);
    // Don't throw - let the test proceed and fail naturally if elements aren't found
  }
}

/**
 * Wait for app store page components to load
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForAppStoreComponents(page: Page, timeout = 10000) {
  try {
    await page.waitForLoadState("networkidle", { timeout });

    // Wait for skeleton loaders to disappear
    await page.waitForFunction(
      () => {
        const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
        return skeletons.length === 0;
      },
      undefined,
      { timeout }
    );

    // Wait for app cards to be visible
    await page.waitForSelector('[data-testid*="app-"], .app-card, [class*="app-card"]', { timeout });
  } catch (error) {
    console.warn(`Warning: Timeout waiting for app store components: ${error}`);
  }
}
