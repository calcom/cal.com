import { Page, chromium } from "@playwright/test";

// TODO: Import it in _playwright/config/globalSetup.ts and export it from there.
import { loginAsUser } from "@calcom/app-store/_apps-playwright/config/globalSetup";
import { hashPassword } from "@calcom/lib/auth";

import prisma from "@lib/prisma";

async function installApp(appName: string, redirectUrl: string, page: Page) {
  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/apps/${appName}`);
  await page.click('[data-testid="install-app-button"]');
  await page.waitForNavigation({
    url: (url) => {
      return url.pathname == redirectUrl;
    },
  });
}

async function createUser(userName: string) {
  const email = `${userName}@example.com`;
  await prisma.user.create({
    data: {
      username: userName,
      email,
      completedOnboarding: true,
      password: await hashPassword(userName),
    },
  });
}

async function globalSetup(/* config: FullConfig */) {
  const browser = await chromium.launch({
    headless: true,
  });
  const page = await browser.newPage();
  const appName = "routing_forms";
  const userName = `${appName}-e2e-${Math.random()}`;
  process.env.APP_USER_NAME = userName;
  await createUser(userName);
  await loginAsUser(userName, page);
  await installApp(appName, `/apps/${appName}/forms`, page);
  page.context().close();
}

export default globalSetup;
