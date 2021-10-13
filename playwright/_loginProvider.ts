/* eslint-disable @typescript-eslint/ban-types */
import { provider, Provider } from "kont";
import { Browser } from "playwright";

/**
 * Context data that Login provder needs.
 */
export type Needs = {
  browser: Browser;
};

/**
 * Login provider's options.
 */
export type Params = {
  user: string;
};

/**
 * Context data that Page provider contributes.
 */
export type Contributes = {};

/**
 * Add a Playwright page to the context (`.page`).
 *
 * If the context has a browser (`.browser`) then it will be used to create the page.
 * Otherwise a chromium browser will be automatically created and used.
 */
export const loginProvider = (user: string): Provider<Needs, Contributes> => {
  const config = {
    user,
  };

  return (
    provider<Needs, Contributes>()
      .name("page")
      .before(async (ctx) => {
        const page = await ctx.browser.newPage();
        await page.goto("http://localhost:3000/event-types");
        // Click input[name="email"]
        await page.click('input[name="email"]');
        // Fill input[name="email"]
        await page.fill('input[name="email"]', `${config.user}@example.com`);
        // Press Tab
        await page.press('input[name="email"]', "Tab");
        // Fill input[name="password"]
        await page.fill('input[name="password"]', config.user);
        // Press Enter
        await page.press('input[name="password"]', "Enter");

        await page.waitForSelector("[data-testid=event-types]");

        await page.close();
        console.log("logged in");
        return {};
      })
      // .after(async (ctx) => {})
      .done()
  );
};
