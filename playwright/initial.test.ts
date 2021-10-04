jest.setTimeout(35e3);

test("go to /pro", async () => {
  // Go to http://localhost:3000/auth/login
  await page.goto("http://localhost:3000/auth/login");
  // Click input[name="email"]
  await page.click('input[name="email"]');
  // Fill input[name="email"]
  await page.fill('input[name="email"]', "pro@example.com");
  // Press Tab
  await page.press('input[name="email"]', "Tab");
  // Fill input[name="password"]
  await page.fill('input[name="password"]', "pro");
  // Press Enter
  await page.press('input[name="password"]', "Enter");

  await page.waitForSelector("[data-testid=event-types]");

  const $eventTypes = await page.$$("[data-testid=event-types] > *");
  expect($eventTypes.length).toBeGreaterThanOrEqual(2);
});

export {};
