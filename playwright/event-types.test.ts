import { kont, providers } from "kont";

import { loginProvider } from "./_loginProvider";
import { login, randomString } from "./_testUtils";

describe("pro user", () => {
  const ctx = kont()
    .useBeforeAll(providers.browser())
    .useBeforeEach(providers.page())
    .useBeforeAll(loginProvider("pro"))
    .beforeEach(async ({ page }) => {
      await page.goto("http://localhost:3000/event-types");
      console.log("went to event types");
      await page.waitForSelector("[data-testid=event-types]");
      console.log("went to /event-types");
    })
    .done();

  it("has at least 2 events", async () => {
    const $eventTypes = await ctx.page.$$("[data-testid=event-types] > *");
    console.log("$eventTypes", $eventTypes);
    expect($eventTypes.length).toBeGreaterThanOrEqual(2);
    for (const $el of $eventTypes) {
      expect(await $el.getAttribute("data-disabled")).toBe("0");
    }
  });

  it("can add new event type", async () => {
    const { page } = ctx;
    await page.click("[data-testid=new-event-type]");
    const nonce = randomString(3);
    const eventTitle = `hello ${nonce}`;

    await page.fill("[name=title]", eventTitle);
    await page.fill("[name=length]", "10");
    await page.click("[type=submit]");

    // cy.get("[name=title]").focus().type(eventTitle);
    // cy.get("[name=length]").focus().type("10");
    // cy.get("[type=submit]").click();

    // cy.location("pathname").should("not.eq", "/event-types");
    // cy.visit("/event-types");

    // cy.get("[data-testid=event-types]").contains(eventTitle);
  });
});
