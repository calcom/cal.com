import { kont } from "kont";

import { pageProvider } from "./lib/pageProvider";

jest.setTimeout(60e3);
if (process.env.CI) {
  jest.retryTimes(3);
}

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

  test("book an event first day in next month", async () => {
    const { page } = ctx;
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    // Click [data-testid="incrementMonth"]
    await page.click('[data-testid="incrementMonth"]');
    // Click [data-testid="day"]
    await page.click('[data-testid="day"][data-disabled="false"]');
    // Click [data-testid="time"]
    await page.click('[data-testid="time"]');
    // --- fill form
    await page.fill('[name="name"]', "Test Testson");
    await page.fill('[name="email"]', "test@example.com");
    await page.press('[name="email"]', "Enter");

    // Make sure we're navigated to the success page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });
  });
});
