import type { Page, WorkerInfo } from "@playwright/test";
import type Prisma from "@prisma/client";
import { Prisma as PrismaType, UserPlan } from "@prisma/client";
import { hash } from "bcryptjs";

import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { prisma } from "@calcom/prisma";

import { TimeZoneEnum } from "./types";

// Don't import hashPassword from app as that ends up importing next-auth and initializing it before NEXTAUTH_URL can be updated during tests.
export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

type UserFixture = ReturnType<typeof createUserFixture>;

const userIncludes = PrismaType.validator<PrismaType.UserInclude>()({
  eventTypes: true,
  credentials: true,
});

const userWithEventTypes = PrismaType.validator<PrismaType.UserArgs>()({
  include: userIncludes,
});

type UserWithIncludes = PrismaType.UserGetPayload<typeof userWithEventTypes>;

// creates a user fixture instance and stores the collection
export const createUsersFixture = (page: Page, workerInfo: WorkerInfo) => {
  const store = { users: [], page } as { users: UserFixture[]; page: typeof page };
  return {
    create: async (opts?: CustomUserOpts) => {
      const _user = await prisma.user.create({
        data: await createUser(workerInfo, opts),
      });
      await prisma.eventType.create({
        data: {
          users: {
            connect: {
              id: _user.id,
            },
          },
          title: "Paid",
          slug: "paid",
          length: 30,
          price: 1000,
        },
      });
      await prisma.eventType.create({
        data: {
          users: {
            connect: {
              id: _user.id,
            },
          },
          title: "Opt in",
          slug: "opt-in",
          requiresConfirmation: true,
          length: 30,
        },
      });
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: _user.id },
        include: userIncludes,
      });
      const userFixture = createUserFixture(user, store.page!);
      store.users.push(userFixture);
      return userFixture;
    },
    get: () => store.users,
    logout: async () => {
      await page.goto("/auth/logout");
    },
    deleteAll: async () => {
      const ids = store.users.map((u) => u.id);
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      store.users = [];
    },
    delete: async (id: number) => {
      await prisma.user.delete({ where: { id } });
      store.users = store.users.filter((b) => b.id !== id);
    },
  };
};

type JSONValue = string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

// creates the single user fixture
const createUserFixture = (user: UserWithIncludes, page: Page) => {
  const store = { user, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  const self = async () =>
    (await prisma.user.findUnique({ where: { id: store.user.id }, include: { eventTypes: true } }))!;
  return {
    id: user.id,
    username: user.username,
    eventTypes: user.eventTypes!,
    self,
    login: async () => login({ ...(await self()), password: user.username }, store.page),
    getPaymentCredential: async () => getPaymentCredential(store.page),
    // ths is for developemnt only aimed to inject debugging messages in the metadata field of the user
    debug: async (message: string | Record<string, JSONValue>) => {
      await prisma.user.update({ where: { id: store.user.id }, data: { metadata: { debug: message } } });
    },
    delete: async () => (await prisma.user.delete({ where: { id: store.user.id } }))!,
  };
};

type CustomUserOptsKeys = "username" | "password" | "plan" | "completedOnboarding" | "locale";
type CustomUserOpts = Partial<Pick<Prisma.User, CustomUserOptsKeys>> & { timeZone?: TimeZoneEnum };

// creates the actual user in the db.
const createUser = async (
  workerInfo: WorkerInfo,
  opts?: CustomUserOpts
): Promise<PrismaType.UserCreateInput> => {
  // build a unique name for our user
  const uname = `${opts?.username ?? opts?.plan?.toLocaleLowerCase() ?? UserPlan.PRO.toLowerCase()}-${
    workerInfo.workerIndex
  }-${Date.now()}`;
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
    schedules:
      opts?.completedOnboarding ?? true
        ? {
            create: {
              name: "Working Hours",
              availability: {
                createMany: {
                  data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
                },
              },
            },
          }
        : undefined,
    eventTypes: {
      create: {
        title: "30 min",
        slug: "30-min",
        length: 30,
      },
    },
  };
};

// login using a replay of an E2E routine.
export async function login(
  user: Pick<Prisma.User, "username"> & Partial<Pick<Prisma.User, "password" | "email">>,
  page: Page
) {
  // get locators
  const loginLocator = page.locator("[data-testid=login-form]");
  const emailLocator = loginLocator.locator("#email");
  const passwordLocator = loginLocator.locator("#password");
  const signInLocator = loginLocator.locator('[type="submit"]');

  //login
  await page.goto("/");
  await emailLocator.fill(user.email ?? `${user.username}@example.com`);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await passwordLocator.fill(user.password ?? user.username!);
  await signInLocator.click();

  // 2 seconds of delay to give the session enough time for a clean load
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(2000);
}

export async function getPaymentCredential(page: Page) {
  await page.goto("/apps/stripe");

  /** We start the Stripe flow */
  await Promise.all([
    page.waitForNavigation({ url: "https://connect.stripe.com/oauth/v2/authorize?*" }),
    page.click('[data-testid="install-app-button"]'),
  ]);

  await Promise.all([
    page.waitForNavigation({ url: "/apps/installed" }),
    /** We skip filling Stripe forms (testing mode only) */
    page.click('[id="skip-account-app"]'),
  ]);
}
