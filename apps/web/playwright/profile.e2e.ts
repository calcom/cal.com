import { WEBAPP_URL } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { createEmailsFixture } from "./fixtures/emails";
import type { createUsersFixture } from "./fixtures/users";
import { test } from "./lib/fixtures";
import { getEmailsReceivedByUser, submitAndWaitForResponse } from "./lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./team/expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Teams", () => {
  test("Profile page is loaded for users in Organization", async ({ page, users }) => {
    const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];
    const owner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      hasSubteam: true,
      teammates: teamMatesObj,
    });
    await owner.apiLogin();
    await page.goto("/settings/my-account/profile");

    // check if user avatar is loaded
    await page.getByTestId("profile-upload-avatar").isVisible();
  });
});

test.describe("Update Profile", () => {
  test("Cannot update a users email when existing user has same email (verification enabled)", async ({
    page,
    users,
    prisma,
    features,
  }) => {
    const emailVerificationEnabled = features.get("email-verification");
    // eslint-disable-next-line playwright/no-conditional-in-test, playwright/no-skipped-test
    if (!emailVerificationEnabled?.enabled) test.skip();

    const user = await users.create({
      name: "update-profile-user",
    });

    const [emailInfo, emailDomain] = user.email.split("@");
    const email = `${emailInfo}-updated@${emailDomain}`;

    await user.apiLogin();
    await page.goto("/settings/my-account/profile");
    await page.waitForLoadState("networkidle");

    const emailInput = page.getByTestId("profile-form-email-0").first();

    await emailInput.fill(email);

    await page.getByTestId("profile-submit-button").first().click();

    await page
      .getByTestId("password")
      .first()
      .fill(user?.username ?? "Nameless User");

    await submitAndWaitForResponse(page, "/api/trpc/me/updateProfile?batch=1", {
      action: () => page.getByTestId("profile-update-email-submit-button").first().click(),
    });

    // Instead of dealing with emails in e2e lets just get the token and navigate to it
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: user.email,
      },
    });

    const params = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      token: verificationToken!.token,
    });

    await users.create({
      email,
    });

    const verifyUrl = `${WEBAPP_URL}/auth/verify-email-change?${params.toString()}`;

    await page.goto(verifyUrl);

    const errorLocator = await page.getByTestId("toast-error");

    expect(errorLocator).toBeDefined();

    await page.goto("/settings/my-account/profile");
    const emailInputUpdated = page.getByTestId("profile-form-email-0");
    expect(await emailInputUpdated.inputValue()).toEqual(user.email);
  });

  // TODO: This test is extremely flaky and has been failing a lot, blocking many PRs. Fix this.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip("Can update a users email (verification enabled)", async ({ page, users, prisma, features }) => {
    const emailVerificationEnabled = features.get("email-verification");
    // eslint-disable-next-line playwright/no-conditional-in-test, playwright/no-skipped-test
    if (!emailVerificationEnabled?.enabled) test.skip();

    const user = await users.create({
      name: "update-profile-user",
    });

    const [emailInfo, emailDomain] = user.email.split("@");
    const email = `${emailInfo}-updated@${emailDomain}`;

    await user.apiLogin();
    await page.goto("/settings/my-account/profile");

    const emailInput = page.getByTestId("profile-form-email-0");

    await emailInput.fill(email);

    await page.getByTestId("profile-submit-button").click();

    await page.getByTestId("password").fill(user?.username ?? "Nameless User");

    await page.getByTestId("profile-update-email-submit-button").click();

    await expect(page.getByTestId("toast-success")).toContainText(email);

    // Instead of dealing with emails in e2e lets just get the token and navigate to it
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: user.email,
      },
    });

    const params = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      token: verificationToken!.token,
    });

    const verifyUrl = `${WEBAPP_URL}/auth/verify-email-change?${params.toString()}`;

    await page.goto(verifyUrl);

    await expect(page.getByTestId("toast-success")).toContainText(email);

    // After email verification is successful. user is sent to /event-types
    await page.waitForURL("/event-types");

    await page.goto("/settings/my-account/profile");
    const emailInputUpdated = await page.getByTestId("profile-form-email-0");
    expect(await emailInputUpdated.inputValue()).toEqual(email);
  });

  test("Can update a users email (verification disabled)", async ({ page, users, prisma, features }) => {
    const emailVerificationEnabled = features.get("email-verification");
    // eslint-disable-next-line playwright/no-conditional-in-test, playwright/no-skipped-test
    if (emailVerificationEnabled?.enabled) test.skip();

    const user = await users.create({
      name: "update-profile-user",
    });

    const [emailInfo, emailDomain] = user.email.split("@");
    const email = `${emailInfo}-updated@${emailDomain}`;

    await user.apiLogin();
    await page.goto("/settings/my-account/profile");

    const emailInput = page.getByTestId("profile-form-email-0");

    await emailInput.fill(email);

    await page.getByTestId("profile-submit-button").click();

    await page.getByTestId("password").fill(user?.username ?? "Nameless User");

    await page.getByTestId("profile-update-email-submit-button").click();

    await expect(page.getByTestId("toast-success")).toBeVisible();

    const emailInputUpdated = page.getByTestId("profile-form-email-0");

    expect(await emailInputUpdated.inputValue()).toEqual(email);
  });

  const testEmailVerificationLink = async ({
    page,
    prisma,
    emails,
    secondaryEmail,
  }: {
    page: Page;
    prisma: PrismaClient;
    emails: ReturnType<typeof createEmailsFixture>;
    secondaryEmail: string;
  }) => {
    await test.step("the user receives the correct invitation link", async () => {
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          identifier: secondaryEmail,
        },
      });
      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        secondaryEmail,
        "Verify your email address",
        "verify-email"
      );
      expect(inviteLink).toEqual(`${WEBAPP_URL}/api/auth/verify-email?token=${verificationToken?.token}`);
    });
  };

  test("Can add a new email as a secondary email", async ({ page, users, prisma, emails }) => {
    const user = await users.create({
      name: "update-profile-user",
    });

    const [emailInfo, emailDomain] = user.email.split("@");

    await user.apiLogin();
    await page.goto("/settings/my-account/profile");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("add-secondary-email").click();

    const secondaryEmailAddDialog = await page.waitForSelector('[data-testid="secondary-email-add-dialog"]');
    expect(await secondaryEmailAddDialog.isVisible()).toBe(true);

    const secondaryEmail = `${emailInfo}-secondary-email@${emailDomain}`;
    const secondaryEmailInput = page.getByTestId("secondary-email-input");
    await secondaryEmailInput.fill(secondaryEmail);

    await page.getByTestId("add-secondary-email-button").click();

    const secondaryEmailConfirmDialog = await page.waitForSelector(
      '[data-testid="secondary-email-confirm-dialog"]'
    );
    expect(await secondaryEmailConfirmDialog.isVisible()).toBe(true);

    const textContent = await secondaryEmailConfirmDialog.textContent();
    expect(textContent).toContain(secondaryEmail);

    await page.getByTestId("secondary-email-confirm-done-button").click();
    expect(await secondaryEmailConfirmDialog.isVisible()).toBe(false);

    await test.step("the user receives the correct invitation link", async () => {
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          identifier: secondaryEmail,
        },
      });
      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        secondaryEmail,
        "Verify your email address",
        "verify-email"
      );
      expect(inviteLink?.endsWith(`/api/auth/verify-email?token=${verificationToken?.token}`)).toEqual(true);
    });

    const primaryEmail = page.getByTestId("profile-form-email-0");
    expect(await primaryEmail.inputValue()).toEqual(user.email);

    const newlyAddedSecondaryEmail = page.getByTestId("profile-form-email-1");
    expect(await newlyAddedSecondaryEmail.inputValue()).toEqual(secondaryEmail);
  });

  const createSecondaryEmail = async ({
    page,
    users,
  }: {
    page: Page;
    users: ReturnType<typeof createUsersFixture>;
  }) => {
    const user = await users.create({
      name: "update-profile-user",
    });

    const [emailInfo, emailDomain] = user.email.split("@");
    const email = `${emailInfo}@${emailDomain}`;

    await user.apiLogin();
    await page.goto("/settings/my-account/profile");

    await page.getByTestId("add-secondary-email").click();

    const secondaryEmail = `${emailInfo}-secondary-email@${emailDomain}`;
    const secondaryEmailInput = await page.getByTestId("secondary-email-input");
    await secondaryEmailInput.fill(secondaryEmail);

    await page.getByTestId("add-secondary-email-button").click();

    await page.getByTestId("secondary-email-confirm-done-button").click();

    await expect(secondaryEmailInput).toBeHidden();

    return { user, email, secondaryEmail };
  };

  test("Newly added secondary email should show as Unverified", async ({ page, users }) => {
    await createSecondaryEmail({ page, users });

    await expect(page.getByTestId("profile-form-email-0-primary-badge")).toBeVisible();
    await expect(page.getByTestId("profile-form-email-0-unverified-badge")).toBeHidden();

    await expect(page.getByTestId("profile-form-email-1-primary-badge")).toBeHidden();
    await expect(page.getByTestId("profile-form-email-1-unverified-badge")).toBeVisible();
  });

  // TODO: This test is extremely flaky and has been failing a lot, blocking many PRs. Fix this.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip("Can verify the newly added secondary email", async ({ page, users, prisma }) => {
    const { secondaryEmail } = await createSecondaryEmail({ page, users });

    await expect(page.getByTestId("profile-form-email-1-primary-badge")).toBeHidden();
    await expect(page.getByTestId("profile-form-email-1-unverified-badge")).toBeVisible();
    // Instead of dealing with emails in e2e lets just get the token and navigate to it
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: secondaryEmail,
      },
    });

    const params = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      token: verificationToken!.token,
    });

    const verifyUrl = `${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`;

    await page.goto(verifyUrl);

    await expect(page.getByTestId("profile-form-email-1-primary-badge")).toBeHidden();
    await expect(page.getByTestId("profile-form-email-1-unverified-badge")).toBeVisible();
  });

  test("Can delete the newly added secondary email", async ({ page, users }) => {
    await createSecondaryEmail({ page, users });

    await page.getByTestId("secondary-email-action-group-button").nth(1).click();
    await page.getByTestId("secondary-email-delete-button").click();

    await expect(page.getByTestId("profile-form-email-1")).toBeHidden();
  });

  test("Can make the newly added secondary email as the primary email and login", async ({
    page,
    users,
    prisma,
  }) => {
    const { secondaryEmail } = await createSecondaryEmail({ page, users });

    // Instead of dealing with emails in e2e lets just get the token and navigate to it
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: secondaryEmail,
      },
    });

    const params = new URLSearchParams({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      token: verificationToken!.token,
    });

    const verifyUrl = `${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`;

    await page.goto(verifyUrl);
    await page.getByTestId("secondary-email-action-group-button").nth(1).click();
    await page.getByTestId("secondary-email-make-primary-button").click();

    await expect(page.getByTestId("profile-form-email-1-primary-badge")).toBeVisible();
    await expect(page.getByTestId("profile-form-email-1-unverified-badge")).toBeHidden();
  });

  // TODO: This test is extremely flaky and has been failing a lot, blocking many PRs. Fix this.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip("Can resend verification link if the secondary email is unverified", async ({
    page,
    users,
    prisma,
    emails,
  }) => {
    const { secondaryEmail } = await createSecondaryEmail({ page, users });
    // When a user is created a link is sent, we will delete it manually to make sure verification link works fine
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: secondaryEmail,
      },
    });
    const receivedEmails = await getEmailsReceivedByUser({ emails, userEmail: secondaryEmail });
    if (receivedEmails?.items?.[0]?.ID) {
      await emails.deleteMessage(receivedEmails.items[0].ID);
    }

    await expect(page.getByTestId("profile-form-email-1-unverified-badge")).toBeVisible();
    await page.getByTestId("secondary-email-action-group-button").nth(1).click();
    await expect(page.locator("button[data-testid=resend-verify-email-button]")).toBeEnabled();
    await page.getByTestId("resend-verify-email-button").click();

    await testEmailVerificationLink({ page, prisma, emails, secondaryEmail });

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: secondaryEmail,
      },
    });
    await page.goto(`${WEBAPP_URL}/api/auth/verify-email?token=${verificationToken?.token}`);

    await page.getByTestId("secondary-email-action-group-button").nth(1).click();
    await expect(page.locator("button[data-testid=resend-verify-email-button]")).toBeHidden();
    await expect(page.getByTestId("profile-form-email-1-unverified-badge")).toBeHidden();
  });
});
