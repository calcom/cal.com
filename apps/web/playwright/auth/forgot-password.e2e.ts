import { expect } from "@playwright/test";
import { uuid } from "short-uuid";

import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import prisma from "@calcom/prisma";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Forgot password", async () => {
  test("Can reset forgotten password", async ({ page, users }) => {
    const user = await users.create();

    // Got to reset password flow
    await page.goto("/auth/forgot-password");

    await page.fill('input[name="email"]', `${user.username}@example.com`);
    await page.press('input[name="email"]', "Enter");

    // wait for confirm page.
    await page.waitForSelector("text=Reset link sent");

    // As a workaround, we query the db for the last created password request
    // there should be one, otherwise we throw
    const { id } = await prisma.resetPasswordRequest.findFirstOrThrow({
      where: {
        email: user.email,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Test when a user changes his email after starting the password reset flow
    await prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        email: `${user.username}-2@example.com`,
      },
    });

    await page.goto(`/auth/forgot-password/${id}`);

    await page.waitForSelector("text=That request is expired.");

    // Change the email back to continue testing.
    await prisma.user.update({
      where: {
        email: `${user.username}-2@example.com`,
      },
      data: {
        email: user.email,
      },
    });

    await page.goto(`/auth/forgot-password/${id}`);

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
    const updatedPassword = updatedUser.password!.hash;
    expect(await verifyPassword(newPassword, updatedPassword)).toBeTruthy();

    // finally, make sure the same URL cannot be used to reset the password again, as it should be expired.
    await page.goto(`/auth/forgot-password/${id}`);

    await expect(page.locator(`text=Whoops`)).toBeVisible();
  });
});
