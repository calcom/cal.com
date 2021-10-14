import { kont } from "kont";

import { pageProvider } from "./lib/pageProvider";

jest.setTimeout(60e3);

describe("free user", () => {
  const ctx = kont()
    .useBeforeEach(pageProvider({ path: "/free" }))
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
    .useBeforeEach(pageProvider({ path: "/pro" }))
    .done();

  test("pro user's page has at least 2 visible events", async () => {
    const { page } = ctx;
    const $eventTypes = await page.$$("[data-testid=event-types] > *");

    expect($eventTypes.length).toBeGreaterThanOrEqual(2);
  });

  // TODO: make sure `/free/30min` is bookable and that `/free/60min` is not
});
