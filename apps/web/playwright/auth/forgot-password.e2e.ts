import { expect } from "@playwright/test";
import { uuid } from "short-uuid";

import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import prisma from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test("Can reset forgotten password", async ({ page, users, emails }) => {
  const user = await users.create({ email: emails.generateAddress() });

  // Got to reset password flow
  await page.goto("/auth/forgot-password");

  await page.fill('input[name="email"]', user.email);
  await page.press('input[name="email"]', "Enter");

  // wait for confirm page.
  await page.waitForSelector("text=Reset link sent");

  const email = await emails.waitForOne(user.email);

  // Test when a user changes his email after starting the password reset flow
  await prisma.user.update({
    where: {
      email: user.email,
    },
    data: {
      email: `2-${user.email}`,
    },
  });

  await email.clickCta();
  await page.waitForSelector("text=That request is expired.");

  // Change the email back to continue testing.
  await prisma.user.update({
    where: {
      email: `2-${user.email}`,
    },
    data: {
      email: user.email,
    },
  });

  await email.clickCta();

  const newPassword = `${user.username}-123CAL-${uuid().toString()}`; // To match the password policy

  // Wait for page to fully load
  await page.waitForSelector("text=Reset Password");

  await page.fill('input[name="new_password"]', newPassword);
  await page.click('button[type="submit"]');

  await page.waitForSelector("text=Password updated");

  await expect(page.locator(`text=Password updated`)).toBeVisible();
  // now we check our DB to confirm the password was indeed updated.
  // we're not logging in to the UI to speed up test performance.
  const updatedUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
    },
    select: {
      id: true,
      password: true,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await expect(await verifyPassword(newPassword, updatedUser.password!)).toBeTruthy();

  // finally, make sure the same URL cannot be used to reset the password again, as it should be expired.
  await email.clickCta();
  await page.waitForSelector("text=That request is expired.");
});
