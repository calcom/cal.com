/**
 * This is a Playwright script Checkly generated for you based on your Vercel project.
 * To learn more about Browser checks and Playwright visit: https://www.checklyhq.com/docs/browser-checks
 */

// Create a Chromium browser
const { chromium } = require("playwright");

// Checkly supports top level await, but we wrap your code in an async function so you can run it locally too.
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const targetUrl = process.env.ENVIRONMENT_URL || "https://cal.com";
  await page.goto(`${targetUrl}/rick/test-location-link`);

  await page.waitForSelector('[data-testid="day"][data-disabled="false"]');
  await page.click('[data-testid="day"][data-disabled="false"]');

  await page.waitForSelector('[data-testid="time"]');
  await page.click('[data-testid="time"]');

  await page.waitForSelector("#name");
  await page.click("#name");

  await page.type("#name", "Calcom");

  await page.type('[name="email"]', "cal@cal.com");

  await page.waitForSelector('[data-testid="confirm-book-button"]');
  await page.click('[data-testid="confirm-book-button"]');

  await browser.close();
}

run();
