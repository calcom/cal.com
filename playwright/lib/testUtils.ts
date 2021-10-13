import { BrowserContext } from "playwright";

export function randomString(length: number) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Login with user returning a [possibly prefetched] browser context in case of parallelisation
 * User is always `${user}@example.com` & password is always `${user}`
 * @param user
 */
export async function login(user: string): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:3000/event-types");
  // Click input[name="email"]
  await page.click('input[name="email"]');
  // Fill input[name="email"]
  await page.fill('input[name="email"]', `${user}@example.com`);
  // Press Tab
  await page.press('input[name="email"]', "Tab");
  // Fill input[name="password"]
  await page.fill('input[name="password"]', user);
  // Press Enter
  await page.press('input[name="password"]', "Enter");

  await page.waitForSelector("[data-testid=event-types]");

  return await context;
}
