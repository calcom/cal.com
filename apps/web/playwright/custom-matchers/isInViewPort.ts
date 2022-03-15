import { expect } from "@playwright/test";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      isInViewPort(page: unknown): R;
    }
  }
}

expect.extend({
  // Taken from https://github.com/puppeteer/puppeteer/blob/682f3407dc520a0276acac4b0e914e02f4e6e454/experimental/puppeteer-firefox/lib/JSHandle.js#L190
  isInViewPort: async function isInViewPort(selector, page) {
    const res = await page.$eval(selector, async (el) => {
      const visibleRatio = await new Promise((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          resolve(entries[0].intersectionRatio);
          observer.disconnect();
        });
        observer.observe(el);
        // Firefox doesn't call IntersectionObserver callback unless
        // there are rafs.
        requestAnimationFrame(() => {});
      });
      return {
        message: "expected to be in viewport",
        pass: visibleRatio === 1,
      };
    });
    return {
      message: () => res.message,
      pass: res.pass,
    };
  },
});
