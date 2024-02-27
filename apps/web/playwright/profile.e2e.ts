import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { test } from "./lib/fixtures";

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

    const emailInput = page.getByTestId("profile-form-email");

    await emailInput.fill(email);

    await page.getByTestId("profile-submit-button").click();

    await page.getByTestId("password").fill(user?.username ?? "Nameless User");

    await page.getByTestId("profile-update-email-submit-button").click();

    const toastLocator = await page.getByTestId("toast-success");

    const textContent = await toastLocator.textContent();

    expect(textContent).toContain(email);

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
    const emailInputUpdated = page.getByTestId("profile-form-email");
    expect(await emailInputUpdated.inputValue()).toEqual(user.email);
  });

  test("Can update a users email (verification enabled)", async ({ page, users, prisma, features }) => {
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

    const emailInput = page.getByTestId("profile-form-email");

    await emailInput.fill(email);

    await page.getByTestId("profile-submit-button").click();

    await page.getByTestId("password").fill(user?.username ?? "Nameless User");

    await page.getByTestId("profile-update-email-submit-button").click();

    expect(await page.getByTestId("toast-success").textContent()).toContain(email);

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

    expect(await page.getByTestId("toast-success").textContent()).toContain(email);

    // After email verification is successfull. user is sent to /event-types
    await page.waitForURL("/event-types");

    await page.goto("/settings/my-account/profile");
    const emailInputUpdated = await page.getByTestId("profile-form-email");
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

    const emailInput = page.getByTestId("profile-form-email");

    await emailInput.fill(email);

    await page.getByTestId("profile-submit-button").click();

    await page.getByTestId("password").fill(user?.username ?? "Nameless User");

    await page.getByTestId("profile-update-email-submit-button").click();

    expect(await page.getByTestId("toast-success").isVisible()).toBe(true);

    const emailInputUpdated = page.getByTestId("profile-form-email");

    expect(await emailInputUpdated.inputValue()).toEqual(email);
  });
});
