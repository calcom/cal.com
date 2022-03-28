import type { Page } from "@playwright/test";
import { UserPlan } from "@prisma/client";
import type Prisma from "@prisma/client";

import { hashPassword } from "@calcom/lib/auth";
import { prisma } from "@calcom/prisma";

export interface UsersFixture {
  create: (opts?: CustomUserOpts) => Promise<UserFixture>;
  get: () => UserFixture[];
  logout: () => Promise<void>;
}

interface UserFixture {
  id: number;
  self: () => Promise<Prisma.User>;
  login: () => Promise<void>;
  debug: (message: Record<string, any>) => Promise<void>;
}

// An alias for the hard to remember timezones strings
export enum TimeZoneE {
  USA = "America/Phoenix",
  UK = "Europe/London",
}

// creates a user fixture instance and stores the collection
export const createUsersFixture = (page: Page): UsersFixture => {
  let store = { users: [], page } as { users: UserFixture[]; page: typeof page };
  return {
    create: async (opts) => {
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

// creates the single user fixture
const createUserFixture = (user: Prisma.User, page: Page): UserFixture => {
  const store = { user, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  const self = async () => (await prisma.user.findUnique({ where: { id: store.user.id } }))!;
  return {
    id: user.id,
    self,
    login: async () => login(await self(), store.page),
    // ths is for developemnt only aimed to inject debugging messages in the metadata field of the user
    debug: async (message) => {
      await prisma.user.update({ where: { id: store.user.id }, data: { metadata: { debug: message } } });
    },
  };
};

type CustomUserOptsKeys = "username" | "plan" | "completedOnboarding" | "locale";
type CustomUserOpts = Partial<Pick<Prisma.User, CustomUserOptsKeys>> & { timeZone?: TimeZoneE };

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
    timeZone: opts?.timeZone ?? TimeZoneE.UK,
    locale: opts?.locale ?? "en",
  };
};

// login using a replay of an E2E routine.
async function login(user: Prisma.User, page: Page) {
  await page.goto("/auth/logout");
  await page.goto("/");
  await page.click('input[name="email"]');
  await page.fill('input[name="email"]', user.email);
  await page.press('input[name="email"]', "Tab");
  await page.fill('input[name="password"]', user.username!);
  await page.press('input[name="password"]', "Enter");

  // 2 seconds of delay before returning to help the session loading well
  await page.waitForTimeout(2000);
}
