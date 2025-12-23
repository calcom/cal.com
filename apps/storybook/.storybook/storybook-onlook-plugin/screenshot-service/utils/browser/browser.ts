import { type Browser, chromium } from 'playwright';

let browser: Browser | null = null;

/**
 * Initialize browser instance
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
    });
  }
  return browser;
}

/**
 * Close browser instance
 */
export async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    } finally {
      browser = null;
    }
  }
}
