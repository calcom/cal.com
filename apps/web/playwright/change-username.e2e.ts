import { WEBAPP_URL } from "@calcom/lib/constants";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { IS_STRIPE_ENABLED, submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

const IS_SELF_HOSTED = !(
  new URL(WEBAPP_URL).hostname.endsWith(".cal.dev") || !!new URL(WEBAPP_URL).hostname.endsWith(".cal.com")
);

const TESTING_USERNAMES = [
  {
    username: "demousernamex",
    description: "",
  },
  {
    username: "demo.username",
    description: " to include periods(or dots)",
  },
];

test.describe("Change username on settings", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  TESTING_USERNAMES.forEach((item) => {
    test(`User can change username${item.description}`, async ({ page, users, prisma }) => {
      const user = await users.create();
      await user.apiLogin();
      // Try to go homepage
      await page.goto("/settings/my-account/profile");
      // Change username from normal to normal
      const usernameInput = page.locator("[data-testid=username-input]");

      await usernameInput.fill(item.username);
      await page.click("[data-testid=update-username-btn]");
      await submitAndWaitForResponse(page, "/api/trpc/me/updateProfile?batch=1", {
        action: () => page.click("[data-testid=save-username]"),
      });

      const newUpdatedUser = await prisma.user.findUniqueOrThrow({
        where: {
          id: user.id,
        },
      });

      expect(newUpdatedUser.username).toBe(item.username);
    });
  });

  test("User can update to PREMIUM username", async ({ page, users }, testInfo) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "It should only run if Stripe is installed");
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(IS_SELF_HOSTED, "It shouldn't run on self hosted");

    const user = await users.create();
    await stripe.customers.create({ email: `${user?.username}@example.com` });

    await user.apiLogin();
    await page.goto("/settings/my-account/profile");

    // Change username from normal to premium
    const usernameInput = page.locator("[data-testid=username-input]");

    await usernameInput.fill(`xx${testInfo.workerIndex}`);

    // Click on save button
    await page.click('button[type="submit"]');

    // Validate modal text fields
    const currentUsernameText = page.locator("[data-testid=current-username]").innerText();
    const newUsernameText = page.locator("[data-testid=new-username]").innerText();

    expect(currentUsernameText).not.toBe(newUsernameText);

    // Click on Go to billing
    await page.click("[data-testid=go-to-billing]", { timeout: 300 });

    await page.waitForLoadState();

    await expect(page).toHaveURL(/.*checkout.stripe.com/);
  });

});
