import { expect } from "@playwright/test";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      isInViewPort(page: unknown): R;
    }
  }
}

expect.extend({
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
