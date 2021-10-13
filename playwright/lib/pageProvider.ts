/* eslint-disable @typescript-eslint/ban-types */
import { provider, Provider } from "kont";
import { Page } from "playwright";

/**
 * Context data that Page provder needs.
 */
export type Needs = {};

/**
 * Page provider's options.
 */
export type Params = {
  user: string;
};

/**
 * Context data that Page provider contributes.
 */
export type Contributes = {
  page: Page;
};

/**
 * Creates a new context / "incognito tab" and logs in the specified user
 */
export function pageProvider(opts: {
  /**
   * Path to navigate to
   */
  path: string;
}): Provider<Needs, Contributes> {
  return provider<Needs, Contributes>()
    .name("page")
    .before(async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`http://localhost:3000${opts.path}`);

      return {
        page,
        context,
      };
    })
    .after(async (ctx) => {
      await ctx.page?.close();
      await ctx.context?.close();
    })
    .done();
}
