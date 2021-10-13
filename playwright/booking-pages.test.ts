import { kont } from "kont";

jest.setTimeout(60e3);

describe("free user", () => {
  const ctx = kont()
    .beforeEach(async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("http://localhost:3000/free");

      return {
        page,
        context,
      };
    })
    .afterEach(async (ktx) => {
      await ktx.page?.close();
      await ktx.context?.close();
    })
    .done();

  test("only one visible event", async () => {
    const { page } = ctx;
    await expect(page).toHaveSelector(`[href="/free/30min"]`);
    await expect(page).not.toHaveSelector(`[href="/free/60min"]`);
  });

  // TODO: make sure `/free/30min` is bookable and that `/free/60min` is not
});

describe("pro user", () => {
  const ctx = kont()
    .beforeEach(async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("http://localhost:3000/pro");

      return {
        page,
        context,
      };
    })
    .afterEach(async (ktx) => {
      await ktx.page?.close();
      await ktx.context?.close();
    })
    .done();

  test("pro user's page has at least 2 visible events", async () => {
    const { page } = ctx;
    const $eventTypes = await page.$$("[data-testid=event-types] > *");

    expect($eventTypes.length).toBeGreaterThanOrEqual(2);
  });

  // TODO: make sure `/free/30min` is bookable and that `/free/60min` is not
});
