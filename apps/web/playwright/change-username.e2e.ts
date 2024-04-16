import { expect } from "@playwright/test";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";

import { moveUserToOrg } from "@lib/orgMigration";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);

const IS_SELF_HOSTED = !(
  new URL(WEBAPP_URL).hostname.endsWith(".cal.dev") || !!new URL(WEBAPP_URL).hostname.endsWith(".cal.com")
);

test.describe("Change username on settings", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("User can change username", async ({ page, users, prisma }) => {
    const user = await users.create();

    await user.apiLogin();
    // Try to go homepage
    await page.goto("/settings/my-account/profile");
    // Change username from normal to normal
    const usernameInput = page.locator("[data-testid=username-input]");

    await usernameInput.fill("demousernamex");
    await page.click("[data-testid=update-username-btn]");
    await Promise.all([
      page.click("[data-testid=save-username]"),
      page.getByTestId("toast-success").waitFor(),
    ]);

    const newUpdatedUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });

    expect(newUpdatedUser.username).toBe("demousernamex");
  });

  test("User can change username to include periods(or dots)", async ({ page, users, prisma }) => {
    const user = await users.create();

    await user.apiLogin();
    // Try to go homepage
    await page.goto("/settings/my-account/profile");
    // Change username from normal to normal
    const usernameInput = page.locator("[data-testid=username-input]");
    // User can change username to include dots(or periods)
    await usernameInput.fill("demo.username");
    await page.click("[data-testid=update-username-btn]");
    await Promise.all([
      page.click("[data-testid=save-username]"),
      page.getByTestId("toast-success").waitFor(),
    ]);
    await page.waitForLoadState("networkidle");

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.username).toBe("demo.username");
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

  test("User can't take a username that has been migrated to a different username in an organization", async ({
    users,
    orgs,
    page,
  }) => {
    const existingUser =
      await test.step("Migrate user to a different username in an organization", async () => {
        const org = await orgs.create({
          name: "TestOrg",
        });

        const existingUser = await users.create({
          username: "john",
          emailDomain: org.organizationSettings?.orgAutoAcceptEmail ?? "",
          name: "John Outside Organization",
        });

        await moveUserToOrg({
          user: existingUser,
          targetOrg: {
            // Changed username. After this there is no user with username equal to {existingUser.username}
            username: `${existingUser.username}-org`,
            id: org.id,
            membership: {
              role: MembershipRole.MEMBER,
              accepted: true,
            },
          },
          shouldMoveTeams: false,
        });
        return existingUser;
      });

    await test.step("Changing username for another user to the previous username of migrated user - shouldn't be allowed", async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const previousUsername = existingUser.username!;

      const user = await users.create();
      await user.apiLogin();

      await page.goto("/settings/my-account/profile");
      const usernameInput = page.locator("[data-testid=username-input]");

      await usernameInput.fill(previousUsername);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("[data-testid=update-username-btn]").nth(0)).toBeHidden();
      await expect(page.locator("[data-testid=update-username-btn]").nth(1)).toBeHidden();
    });
  });
});
