import type { Page } from "@playwright/test";

declare global {
  interface Window {
    E2E_CLIPBOARD_VALUE?: string;
  }
}

export type Window = typeof window;
// creates the single server fixture
export const createClipboardFixture = (page: Page) => {
  return {
    reset: async () => {
      await page.evaluate(() => {
        delete window.E2E_CLIPBOARD_VALUE;
      });
    },
    get: async () => {
      return getClipboardValue({ page });
    },
  };
};

function getClipboardValue({ page }: { page: Page }) {
  return page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      setInterval(() => {
        if (!window.E2E_CLIPBOARD_VALUE) return;
        resolve(window.E2E_CLIPBOARD_VALUE);
      }, 500);
      setTimeout(() => reject(new Error("Timeout")), 1000);
    });
  });
}
