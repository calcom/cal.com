import { login } from "./_testUtils";

jest.setTimeout(35e3);

test("go to /pro", async () => {
  const ctx = await login("pro");
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/event-types");

  const $eventTypes = await page.$$("[data-testid=event-types] > *");
  expect($eventTypes.length).toBeGreaterThanOrEqual(2);
});

export {};
