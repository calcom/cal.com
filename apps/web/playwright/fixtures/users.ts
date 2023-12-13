import type { Page, WorkerInfo } from "@playwright/test";
import type Prisma from "@prisma/client";
import { Prisma as PrismaType } from "@prisma/client";
import { hashSync as hash } from "bcryptjs";
import type { API } from "mailhog";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { Schedule } from "@calcom/types/schedule";

import { selectFirstAvailableTimeSlotNextMonth, teamEventSlug, teamEventTitle } from "../lib/testUtils";
import { TimeZoneEnum } from "./types";

// Don't import hashPassword from app as that ends up importing next-auth and initializing it before NEXTAUTH_URL can be updated during tests.
export function hashPassword(password: string) {
  const hashedPassword = hash(password, 12);
  return hashedPassword;
}

type UserFixture = ReturnType<typeof createUserFixture>;

const userIncludes = PrismaType.validator<PrismaType.UserInclude>()({
  eventTypes: true,
  credentials: true,
  routingForms: true,
});

const userWithEventTypes = PrismaType.validator<PrismaType.UserArgs>()({
  include: userIncludes,
});

const seededForm = {
  id: "948ae412-d995-4865-875a-48302588de03",
  name: "Seeded Form - Pro",
};

type UserWithIncludes = PrismaType.UserGetPayload<typeof userWithEventTypes>;

const createTeamEventType = async (
  user: { id: number },
  team: { id: number },
  scenario?: {
    schedulingType?: SchedulingType;
    teamEventTitle?: string;
    teamEventSlug?: string;
    teamEventLength?: number;
  }
) => {
  return await prisma.eventType.create({
    data: {
      team: {
        connect: {
          id: team.id,
        },
      },
      users: {
        connect: {
          id: user.id,
        },
      },
      owner: {
        connect: {
          id: user.id,
        },
      },
      hosts: {
        create: {
          userId: user.id,
          isFixed: scenario?.schedulingType === SchedulingType.COLLECTIVE ? true : false,
        },
      },
      schedulingType: scenario?.schedulingType ?? SchedulingType.COLLECTIVE,
      title: scenario?.teamEventTitle ?? `${teamEventTitle}-team-id-${team.id}`,
      slug: scenario?.teamEventSlug ?? `${teamEventSlug}-team-id-${team.id}`,
      length: scenario?.teamEventLength ?? 30,
    },
  });
};

const createTeamAndAddUser = async (
  {
    user,
    isUnpublished,
    isOrg,
    isOrgVerified,
    hasSubteam,
    organizationId,
  }: {
    user: { id: number; email: string; username: string | null; role?: MembershipRole };
    isUnpublished?: boolean;
    isOrg?: boolean;
    isOrgVerified?: boolean;
    hasSubteam?: true;
    organizationId?: number | null;
  },
  workerInfo: WorkerInfo
) => {
  const slug = `${isOrg ? "org" : "team"}-${workerInfo.workerIndex}-${Date.now()}`;
  const data: PrismaType.TeamCreateInput = {
    name: `user-id-${user.id}'s Team ${isOrg ? "Org" : "Team"}`,
  };
  data.metadata = {
    ...(isUnpublished ? { requestedSlug: slug } : {}),
    ...(isOrg
      ? {
          isOrganization: true,
          isOrganizationVerified: !!isOrgVerified,
          orgAutoAcceptEmail: user.email.split("@")[1],
          isOrganizationConfigured: false,
        }
      : {}),
  };
  data.slug = !isUnpublished ? slug : undefined;
  if (isOrg && hasSubteam) {
    const team = await createTeamAndAddUser({ user }, workerInfo);
    await createTeamEventType(user, team);
    data.children = { connect: [{ id: team.id }] };
  }
  data.orgUsers = isOrg ? { connect: [{ id: user.id }] } : undefined;
  data.parent = organizationId ? { connect: { id: organizationId } } : undefined;
  const team = await prisma.team.create({
    data,
  });

  const { role = MembershipRole.OWNER, id: userId } = user;
  await prisma.membership.create({
    data: {
      teamId: team.id,
      userId,
      role: role,
      accepted: true,
    },
  });

  return team;
};

// creates a user fixture instance and stores the collection
export const createUsersFixture = (page: Page, emails: API | undefined, workerInfo: WorkerInfo) => {
  const store = { users: [], page } as { users: UserFixture[]; page: typeof page };
  return {
    buildForSignup: (opts?: Pick<CustomUserOpts, "email" | "username" | "useExactUsername" | "password">) => {
      const uname =
        opts?.useExactUsername && opts?.username
          ? opts.username
          : `${opts?.username || "user"}-${workerInfo.workerIndex}-${Date.now()}`;
      return {
        username: uname,
        email: opts?.email ?? `${uname}@example.com`,
        password: opts?.password ?? uname,
      };
    },
    create: async (
      opts?: CustomUserOpts | null,
      scenario: {
        seedRoutingForms?: boolean;
        hasTeam?: true;
        teammates?: CustomUserOpts[];
        schedulingType?: SchedulingType;
        teamEventTitle?: string;
        teamEventSlug?: string;
        teamEventLength?: number;
        isOrg?: boolean;
        isOrgVerified?: boolean;
        hasSubteam?: true;
        isUnpublished?: true;
      } = {}
    ) => {
      const _user = await prisma.user.create({
        data: createUser(workerInfo, opts),
      });

      let defaultEventTypes: SupportedTestEventTypes[] = [
        { title: "30 min", slug: "30-min", length: 30 },
        { title: "Paid", slug: "paid", length: 30, price: 1000 },
        { title: "Opt in", slug: "opt-in", requiresConfirmation: true, length: 30 },
        { title: "Seated", slug: "seated", seatsPerTimeSlot: 2, length: 30 },
      ];

      if (opts?.eventTypes) defaultEventTypes = defaultEventTypes.concat(opts.eventTypes);
      for (const eventTypeData of defaultEventTypes) {
        eventTypeData.owner = { connect: { id: _user.id } };
        eventTypeData.users = { connect: { id: _user.id } };
        await prisma.eventType.create({
          data: eventTypeData,
        });
      }

      if (scenario.seedRoutingForms) {
        await prisma.app_RoutingForms_Form.create({
          data: {
            routes: [
              {
                id: "8a898988-89ab-4cde-b012-31823f708642",
                action: { type: "eventTypeRedirectUrl", value: "pro/30min" },
                queryValue: {
                  id: "8a898988-89ab-4cde-b012-31823f708642",
                  type: "group",
                  children1: {
                    "8988bbb8-0123-4456-b89a-b1823f70c5ff": {
                      type: "rule",
                      properties: {
                        field: "c4296635-9f12-47b1-8153-c3a854649182",
                        value: ["event-routing"],
                        operator: "equal",
                        valueSrc: ["value"],
                        valueType: ["text"],
                      },
                    },
                  },
                },
              },
              {
                id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
                action: { type: "customPageMessage", value: "Custom Page Result" },
                queryValue: {
                  id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
                  type: "group",
                  children1: {
                    "b99b8a89-89ab-4cde-b012-31823f718ff5": {
                      type: "rule",
                      properties: {
                        field: "c4296635-9f12-47b1-8153-c3a854649182",
                        value: ["custom-page"],
                        operator: "equal",
                        valueSrc: ["value"],
                        valueType: ["text"],
                      },
                    },
                  },
                },
              },
              {
                id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
                action: { type: "externalRedirectUrl", value: "https://google.com" },
                queryValue: {
                  id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
                  type: "group",
                  children1: {
                    "998b9b9a-0123-4456-b89a-b1823f7232b9": {
                      type: "rule",
                      properties: {
                        field: "c4296635-9f12-47b1-8153-c3a854649182",
                        value: ["external-redirect"],
                        operator: "equal",
                        valueSrc: ["value"],
                        valueType: ["text"],
                      },
                    },
                  },
                },
              },
              {
                id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
                action: { type: "customPageMessage", value: "Multiselect chosen" },
                queryValue: {
                  id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
                  type: "group",
                  children1: {
                    "b98a8abb-cdef-4012-b456-718262343d27": {
                      type: "rule",
                      properties: {
                        field: "d4292635-9f12-17b1-9153-c3a854649182",
                        value: [["Option-2"]],
                        operator: "multiselect_equals",
                        valueSrc: ["value"],
                        valueType: ["multiselect"],
                      },
                    },
                  },
                },
              },
              {
                id: "898899aa-4567-489a-bcde-f1823f708646",
                action: { type: "customPageMessage", value: "Fallback Message" },
                isFallback: true,
                queryValue: { id: "898899aa-4567-489a-bcde-f1823f708646", type: "group" },
              },
            ],
            fields: [
              {
                id: "c4296635-9f12-47b1-8153-c3a854649182",
                type: "text",
                label: "Test field",
                required: true,
              },
              {
                id: "d4292635-9f12-17b1-9153-c3a854649182",
                type: "multiselect",
                label: "Multi Select",
                identifier: "multi",
                selectText: "Option-1\nOption-2",
                required: false,
              },
            ],
            user: {
              connect: {
                id: _user.id,
              },
            },
            name: seededForm.name,
          },
        });
      }
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: _user.id },
        include: userIncludes,
      });
      if (scenario.hasTeam) {
        const team = await createTeamAndAddUser(
          {
            user: { id: user.id, email: user.email, username: user.username, role: "OWNER" },
            isUnpublished: scenario.isUnpublished,
            isOrg: scenario.isOrg,
            isOrgVerified: scenario.isOrgVerified,
            hasSubteam: scenario.hasSubteam,
            organizationId: opts?.organizationId,
          },
          workerInfo
        );
        const teamEvent = await createTeamEventType(user, team, scenario);
        if (scenario.teammates) {
          // Create Teammate users
          const teamMatesIds = [];
          for (const teammateObj of scenario.teammates) {
            const teamUser = await prisma.user.create({
              data: createUser(workerInfo, teammateObj),
            });

            // Add teammates to the team
            await prisma.membership.create({
              data: {
                teamId: team.id,
                userId: teamUser.id,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
            });

            // Add teammate to the host list of team event
            await prisma.host.create({
              data: {
                userId: teamUser.id,
                eventTypeId: teamEvent.id,
                isFixed: scenario.schedulingType === SchedulingType.COLLECTIVE ? true : false,
              },
            });

            const teammateFixture = createUserFixture(
              await prisma.user.findUniqueOrThrow({
                where: { id: teamUser.id },
                include: userIncludes,
              }),
              store.page
            );
            teamMatesIds.push(teamUser.id);
            store.users.push(teammateFixture);
          }
          // Add Teammates to OrgUsers
          if (scenario.isOrg) {
            await prisma.team.update({
              where: {
                id: team.id,
              },
              data: {
                orgUsers: {
                  connect: teamMatesIds.map((userId) => ({ id: userId })).concat([{ id: user.id }]),
                },
              },
            });
          }
        }
      }
      const userFixture = createUserFixture(user, store.page);
      store.users.push(userFixture);
      return userFixture;
    },
    get: () => store.users,
    logout: async () => {
      await page.goto("/auth/logout");
    },
    deleteAll: async () => {
      const ids = store.users.map((u) => u.id);
      if (emails) {
        const emailMessageIds: string[] = [];
        for (const user of store.users) {
          const emailMessages = await emails.search(user.email);
          if (emailMessages && emailMessages.count > 0) {
            emailMessages.items.forEach((item) => {
              emailMessageIds.push(item.ID);
            });
          }
        }
        for (const id of emailMessageIds) {
          await emails.deleteMessage(id);
        }
      }

      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      store.users = [];
    },
    delete: async (id: number) => {
      await prisma.user.delete({ where: { id } });
      store.users = store.users.filter((b) => b.id !== id);
    },
    deleteByEmail: async (email: string) => {
      // Use deleteMany instead of delete to avoid the findUniqueOrThrow error that happens before the delete
      await prisma.user.deleteMany({
        where: {
          email,
        },
      });
      store.users = store.users.filter((b) => b.email !== email);
    },
    set: async (email: string) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { email },
        include: userIncludes,
      });
      const userFixture = createUserFixture(user, store.page);
      store.users.push(userFixture);
      return userFixture;
    },
  };
};

type JSONValue = string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

// creates the single user fixture
const createUserFixture = (user: UserWithIncludes, page: Page) => {
  const store = { user, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  const self = async () =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (await prisma.user.findUnique({
      where: { id: store.user.id },
      include: { eventTypes: true },
    }))!;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    eventTypes: user.eventTypes,
    routingForms: user.routingForms,
    self,
    apiLogin: async (password?: string) =>
      apiLogin({ ...(await self()), password: password || user.username }, store.page),
    /**
     * @deprecated use apiLogin instead
     */
    login: async () => login({ ...(await self()), password: user.username }, store.page),
    logout: async () => {
      await page.goto("/auth/logout");
    },
    getFirstTeam: async () => {
      const memberships = await prisma.membership.findMany({
        where: { userId: user.id },
        include: { team: true },
      });

      const membership = memberships
        .map((membership) => {
          return {
            ...membership,
            team: {
              ...membership.team,
              metadata: teamMetadataSchema.parse(membership.team.metadata),
            },
          };
        })
        .find((membership) => !membership.team?.metadata?.isOrganization);
      if (!membership) {
        throw new Error("No team found for user");
      }
      return membership;
    },
    getOrgMembership: async () => {
      return prisma.membership.findFirstOrThrow({
        where: {
          userId: user.id,
          team: {
            metadata: {
              path: ["isOrganization"],
              equals: true,
            },
          },
        },
        include: {
          team: {
            include: {
              children: true,
            },
          },
        },
      });
    },
    getFirstEventAsOwner: async () =>
      prisma.eventType.findFirstOrThrow({
        where: {
          userId: user.id,
        },
      }),
    getFirstTeamEvent: async (teamId: number) => {
      return prisma.eventType.findFirstOrThrow({
        where: {
          teamId,
        },
      });
    },
    getPaymentCredential: async () => getPaymentCredential(store.page),
    setupEventWithPrice: async (eventType: Pick<Prisma.EventType, "id">) =>
      setupEventWithPrice(eventType, store.page),
    bookAndPayEvent: async (eventType: Pick<Prisma.EventType, "slug">) =>
      bookAndPayEvent(user, eventType, store.page),
    makePaymentUsingStripe: async () => makePaymentUsingStripe(store.page),
    // ths is for developemnt only aimed to inject debugging messages in the metadata field of the user
    debug: async (message: string | Record<string, JSONValue>) => {
      await prisma.user.update({
        where: { id: store.user.id },
        data: { metadata: { debug: message } },
      });
    },
    delete: async () => await prisma.user.delete({ where: { id: store.user.id } }),
    confirmPendingPayment: async () => confirmPendingPayment(store.page),
  };
};

type SupportedTestEventTypes = PrismaType.EventTypeCreateInput & {
  _bookings?: PrismaType.BookingCreateInput[];
};
type CustomUserOptsKeys =
  | "username"
  | "password"
  | "completedOnboarding"
  | "locale"
  | "name"
  | "email"
  | "organizationId";
type CustomUserOpts = Partial<Pick<Prisma.User, CustomUserOptsKeys>> & {
  timeZone?: TimeZoneEnum;
  eventTypes?: SupportedTestEventTypes[];
  // ignores adding the worker-index after username
  useExactUsername?: boolean;
  roleInOrganization?: MembershipRole;
  schedule?: Schedule;
};

// creates the actual user in the db.
const createUser = (
  workerInfo: WorkerInfo,
  opts?: CustomUserOpts | null
): PrismaType.UserUncheckedCreateInput => {
  // build a unique name for our user
  const uname =
    opts?.useExactUsername && opts?.username
      ? opts.username
      : `${opts?.username || "user"}-${workerInfo.workerIndex}-${Date.now()}`;

  return {
    username: uname,
    name: opts?.name,
    email: opts?.email ?? `${uname}@example.com`,
    password: hashPassword(uname),
    emailVerified: new Date(),
    completedOnboarding: opts?.completedOnboarding ?? true,
    timeZone: opts?.timeZone ?? TimeZoneEnum.UK,
    locale: opts?.locale ?? "en",
    ...getOrganizationRelatedProps({ organizationId: opts?.organizationId, role: opts?.roleInOrganization }),
    schedules:
      opts?.completedOnboarding ?? true
        ? {
            create: {
              name: "Working Hours",
              timeZone: opts?.timeZone ?? TimeZoneEnum.UK,
              availability: {
                createMany: {
                  data: getAvailabilityFromSchedule(opts?.schedule ?? DEFAULT_SCHEDULE),
                },
              },
            },
          }
        : undefined,
  };

  function getOrganizationRelatedProps({
    organizationId,
    role,
  }: {
    organizationId: number | null | undefined;
    role: MembershipRole | undefined;
  }) {
    if (!organizationId) {
      return null;
    }
    if (!role) {
      throw new Error("Missing role for user in organization");
    }
    return {
      organizationId: organizationId || null,
      ...(organizationId
        ? {
            teams: {
              // Create membership
              create: [
                {
                  team: {
                    connect: {
                      id: organizationId,
                    },
                  },
                  accepted: true,
                  role: MembershipRole.ADMIN,
                },
              ],
            },
          }
        : null),
    };
  }
};

async function confirmPendingPayment(page: Page) {
  await page.waitForURL(new RegExp("/booking/*"));

  const url = page.url();

  const params = new URLSearchParams(url.split("?")[1]);

  const id = params.get("payment_intent");

  if (!id) throw new Error(`Payment intent not found in url ${url}`);

  const payload = JSON.stringify(
    { type: "payment_intent.succeeded", data: { object: { id } }, account: "e2e_test" },
    null,
    2
  );

  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET as string,
  });

  const response = await page.request.post("/api/integrations/stripepayment/webhook", {
    data: payload,
    headers: { "stripe-signature": signature },
  });

  if (response.status() !== 200) throw new Error(`Failed to confirm payment. Response: ${response.text()}`);
}

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

  // waiting for specific login request to resolve
  await page.waitForResponse(/\/api\/auth\/callback\/credentials/);
}

export async function apiLogin(
  user: Pick<Prisma.User, "username"> & Partial<Pick<Prisma.User, "password" | "email">>,
  page: Page
) {
  const csrfToken = await page
    .context()
    .request.get("/api/auth/csrf")
    .then((response) => response.json())
    .then((json) => json.csrfToken);
  const data = {
    email: user.email ?? `${user.username}@example.com`,
    password: user.password ?? user.username,
    callbackURL: WEBAPP_URL,
    redirect: "false",
    json: "true",
    csrfToken,
  };
  return page.context().request.post("/api/auth/callback/credentials", {
    data,
  });
}

export async function setupEventWithPrice(eventType: Pick<Prisma.EventType, "id">, page: Page) {
  await page.goto(`/event-types/${eventType?.id}?tabName=apps`);
  await page.locator("[data-testid='app-switch']").first().click();
  await page.getByPlaceholder("Price").fill("100");
  await page.getByTestId("update-eventtype").click();
}

export async function bookAndPayEvent(
  user: Pick<Prisma.User, "username">,
  eventType: Pick<Prisma.EventType, "slug">,
  page: Page
) {
  // booking process with stripe integration
  await page.goto(`${user.username}/${eventType?.slug}`);
  await selectFirstAvailableTimeSlotNextMonth(page);
  // --- fill form
  await page.fill('[name="name"]', "Stripe Stripeson");
  await page.fill('[name="email"]', "test@example.com");

  await Promise.all([page.waitForURL("/payment/*"), page.press('[name="email"]', "Enter")]);

  await makePaymentUsingStripe(page);
}

export async function makePaymentUsingStripe(page: Page) {
  const stripeElement = await page.locator(".StripeElement").first();
  const stripeFrame = stripeElement.frameLocator("iframe").first();
  await stripeFrame.locator('[name="number"]').fill("4242 4242 4242 4242");
  const now = new Date();
  await stripeFrame.locator('[name="expiry"]').fill(`${now.getMonth()} / ${now.getFullYear() + 1}`);
  await stripeFrame.locator('[name="cvc"]').fill("111");
  const postcalCodeIsVisible = await stripeFrame.locator('[name="postalCode"]').isVisible();
  if (postcalCodeIsVisible) {
    await stripeFrame.locator('[name="postalCode"]').fill("111111");
  }
  await page.click('button:has-text("Pay now")');
}

export async function getPaymentCredential(page: Page) {
  await page.goto("/apps/stripe");

  /** We start the Stripe flow */
  await Promise.all([
    page.waitForURL("https://connect.stripe.com/oauth/v2/authorize?*"),
    page.click('[data-testid="install-app-button"]'),
  ]);

  await Promise.all([
    page.waitForURL("/apps/installed/payment?hl=stripe"),
    /** We skip filling Stripe forms (testing mode only) */
    page.click('[id="skip-account-app"]'),
  ]);
}
