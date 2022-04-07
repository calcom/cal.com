import type { Page } from "@playwright/test";
import { UserPlan } from "@prisma/client";
import type Prisma from "@prisma/client";

import { hashPassword } from "@calcom/lib/auth";
import { prisma } from "@calcom/prisma";

import { TimeZoneEnum } from "./types";

type UserFixture = ReturnType<typeof createUserFixture>;

// creates a user fixture instance and stores the collection
export const createUsersFixture = (page: Page) => {
  let store = { users: [], page } as { users: UserFixture[]; page: typeof page };
  return {
    create: async (opts?: CustomUserOpts) => {
      const user = await prisma.user.create({
        data: await createUser(opts),
      });
      const userFixture = createUserFixture(user, store.page!);
      store.users.push(userFixture);
      return userFixture;
    },
    get: () => store.users,
    logout: async () => {
      await page.goto("/auth/logout");
    },
  };
};

type JSONValue = string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

// creates the single user fixture
const createUserFixture = (user: Prisma.User, page: Page) => {
  const store = { user, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  const self = async () => (await prisma.user.findUnique({ where: { id: store.user.id } }))!;
  return {
    id: user.id,
    self,
    login: async () => login({ ...(await self()), password: user.username }, store.page),
    onboard: async () =>
      (await self()).completedOnboarding
        ? Promise.resolve(console.log("User is already onboarded"))
        : await onboard(store.page),
    // ths is for developemnt only aimed to inject debugging messages in the metadata field of the user
    debug: async (message: string | Record<string, JSONValue>) => {
      await prisma.user.update({ where: { id: store.user.id }, data: { metadata: { debug: message } } });
    },
  };
};

type CustomUserOptsKeys = "username" | "password" | "plan" | "completedOnboarding" | "locale";
type CustomUserOpts = Partial<Pick<Prisma.User, CustomUserOptsKeys>> & { timeZone?: TimeZoneEnum };

// creates the actual user in the db.
const createUser = async (opts?: CustomUserOpts) => {
  // build a unique name for our user
  const uname =
    (opts?.username ?? opts?.plan?.toLocaleLowerCase() ?? UserPlan.PRO.toLowerCase()) + "-" + Date.now();
  return {
    username: uname,
    name: (opts?.username ?? opts?.plan ?? UserPlan.PRO).toUpperCase(),
    plan: opts?.plan ?? UserPlan.PRO,
    email: `${uname}@example.com`,
    password: await hashPassword(uname),
    emailVerified: new Date(),
    completedOnboarding: opts?.completedOnboarding ?? true,
    timeZone: opts?.timeZone ?? TimeZoneEnum.UK,
    locale: opts?.locale ?? "en",
  };
};

// login using a replay of an E2E routine.
export async function login(
  user: Pick<Prisma.User, "username"> & Partial<Pick<Prisma.User, "password" | "email">>,
  page: Page
) {
  // get locators
  const loginLocator = await page.locator("[data-testid=login-form]");
  const emailLocator = await loginLocator.locator("#email");
  const passwordLocator = await loginLocator.locator("#password");
  const signInLocator = await loginLocator.locator('[type="submit"]');

  //login
  await page.goto("/");
  await emailLocator.fill(user.email ?? `${user.username}@example.com`);
  await passwordLocator.fill(user.password ?? user.username!);
  await signInLocator.click();

  // 1 second of delay to give the session enough time for a clean load
  await page.waitForTimeout(1000);
}

// onboards the user with all the provided defaults
async function onboard(page: Page) {
  await page.goto("/");
  try {
    const onboardingLocator = await page.locator("[data-testid=onboarding]");

    // STEP 1: fullname & timezone
    await onboardingLocator.locator("[data-testid=continue-button-0]").click();
    await page.waitForTimeout(1000);

    // STEP 2: connecting calendars
    await onboardingLocator.locator("[data-testid=onboarding-skip-btn]").click();
    await page.waitForTimeout(1000);

    // STEP 3: Set a default availability schedule
    await onboardingLocator.locator("[data-testid=onboarding-availability-submit-btn]").click();
    await page.waitForTimeout(1000);

    // STEP 4: Fill "About Me"
    await onboardingLocator.locator("[data-testid=continue-button-3]").click();
    await page.waitForTimeout(3000);
  } catch (e) {
    throw new Error("You need to log in before onboarding");
  }
}
