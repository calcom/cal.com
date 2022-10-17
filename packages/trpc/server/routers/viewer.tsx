import { AppCategories, BookingStatus, IdentityProvider, MembershipRole, Prisma } from "@prisma/client";
import _ from "lodash";
import { authenticator } from "otplib";
import z from "zod";

import app_RoutingForms from "@calcom/app-store/ee/routing-forms/trpc-router";
import ethRouter from "@calcom/app-store/rainbow/trpc/router";
import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import { getCustomerAndCheckoutSession } from "@calcom/app-store/stripepayment/lib/getCustomerAndCheckoutSession";
import stripe, { closePayments } from "@calcom/app-store/stripepayment/lib/server";
import getApps, { getLocationOptions } from "@calcom/app-store/utils";
import { cancelScheduledJobs } from "@calcom/app-store/zapier/lib/nodeScheduler";
import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { DailyLocationType } from "@calcom/core/location";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmails, sendFeedbackEmail } from "@calcom/emails";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { ErrorCode, verifyPassword } from "@calcom/lib/auth";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import jackson from "@calcom/lib/jackson";
import {
  hostedCal,
  isSAMLAdmin,
  isSAMLLoginEnabled,
  samlProductID,
  samlTenantID,
  samlTenantProduct,
  tenantPrefix,
} from "@calcom/lib/saml";
import { checkUsername } from "@calcom/lib/server/checkUsername";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isTeamOwner } from "@calcom/lib/server/queries/teams";
import slugify from "@calcom/lib/slugify";
import {
  deleteWebUser as syncServicesDeleteWebUser,
  updateWebUser as syncServicesUpdateWebUser,
} from "@calcom/lib/sync/SyncServiceManager";
import prisma, { baseEventTypeSelect, baseUserSelect, bookingMinimalSelect } from "@calcom/prisma";
import { EventTypeMetaDataSchema, userMetadata } from "@calcom/prisma/zod-utils";
import { resizeBase64Image } from "@calcom/web/server/lib/resizeBase64Image";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter, createRouter } from "../createRouter";
import { apiKeysRouter } from "./viewer/apiKeys";
import { authRouter } from "./viewer/auth";
import { availabilityRouter } from "./viewer/availability";
import { bookingsRouter } from "./viewer/bookings";
import { eventTypesRouter } from "./viewer/eventTypes";
import { slotsRouter } from "./viewer/slots";
import { viewerTeamsRouter } from "./viewer/teams";
import { webhookRouter } from "./viewer/webhook";
import { workflowsRouter } from "./viewer/workflows";

// things that unauthenticated users can query about themselves
const publicViewerRouter = createRouter()
  .query("i18n", {
    async resolve({ ctx }) {
      const { locale, i18n } = ctx;
      return {
        i18n,
        locale,
      };
    },
  })
  .mutation("samlTenantProduct", {
    input: z.object({
      email: z.string().email(),
    }),
    async resolve({ input, ctx }) {
      const { prisma } = ctx;
      const { email } = input;

      return await samlTenantProduct(prisma, email);
    },
  })
  .query("stripeCheckoutSession", {
    input: z.object({
      stripeCustomerId: z.string().optional(),
      checkoutSessionId: z.string().optional(),
    }),
    async resolve({ input }) {
      const { checkoutSessionId, stripeCustomerId } = input;

      // TODO: Move the following data checks to superRefine
      if (!checkoutSessionId && !stripeCustomerId) {
        throw new Error("Missing checkoutSessionId or stripeCustomerId");
      }

      if (checkoutSessionId && stripeCustomerId) {
        throw new Error("Both checkoutSessionId and stripeCustomerId provided");
      }
      let customerId: string;
      let isPremiumUsername = false;
      let hasPaymentFailed = false;
      if (checkoutSessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
          if (typeof session.customer !== "string") {
            return {
              valid: false,
            };
          }
          customerId = session.customer;
          isPremiumUsername = true;
          hasPaymentFailed = session.payment_status !== "paid";
        } catch (e) {
          return {
            valid: false,
          };
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        customerId = stripeCustomerId!;
      }

      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          return {
            valid: false,
          };
        }

        return {
          valid: true,
          hasPaymentFailed,
          isPremiumUsername,
          customer: {
            username: customer.metadata.username,
            email: customer.metadata.email,
            stripeCustomerId: customerId,
          },
        };
      } catch (e) {
        return {
          valid: false,
        };
      }
    },
  })
  .merge("slots.", slotsRouter);

// routes only available to authenticated users
const loggedInViewerRouter = createProtectedRouter()
  .query("me", {
    resolve({ ctx: { user } }) {
      // Destructuring here only makes it more illegible
      // pick only the part we want to expose in the API
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        startTime: user.startTime,
        endTime: user.endTime,
        bufferTime: user.bufferTime,
        locale: user.locale,
        timeFormat: user.timeFormat,
        timeZone: user.timeZone,
        avatar: user.avatar,
        createdDate: user.createdDate,
        trialEndsAt: user.trialEndsAt,
        completedOnboarding: user.completedOnboarding,
        twoFactorEnabled: user.twoFactorEnabled,
        disableImpersonation: user.disableImpersonation,
        identityProvider: user.identityProvider,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        plan: user.plan,
        away: user.away,
        bio: user.bio,
        weekStart: user.weekStart,
        theme: user.theme,
        hideBranding: user.hideBranding,
        metadata: user.metadata,
      };
    },
  })
  .mutation("deleteMe", {
    input: z.object({
      password: z.string(),
      totpCode: z.string().optional(),
    }),
    async resolve({ input, ctx }) {
      // Check if input.password is correct
      const user = await prisma.user.findUnique({
        where: {
          email: ctx.user.email.toLowerCase(),
        },
      });
      if (!user) {
        throw new Error(ErrorCode.UserNotFound);
      }

      if (user.identityProvider !== IdentityProvider.CAL) {
        throw new Error(ErrorCode.ThirdPartyIdentityProviderEnabled);
      }

      if (!user.password) {
        throw new Error(ErrorCode.UserMissingPassword);
      }

      const isCorrectPassword = await verifyPassword(input.password, user.password);
      if (!isCorrectPassword) {
        throw new Error(ErrorCode.IncorrectPassword);
      }

      if (user.twoFactorEnabled) {
        if (!input.totpCode) {
          throw new Error(ErrorCode.SecondFactorRequired);
        }

        if (!user.twoFactorSecret) {
          console.error(`Two factor is enabled for user ${user.id} but they have no secret`);
          throw new Error(ErrorCode.InternalServerError);
        }

        if (!process.env.CALENDSO_ENCRYPTION_KEY) {
          console.error(`"Missing encryption key; cannot proceed with two factor login."`);
          throw new Error(ErrorCode.InternalServerError);
        }

        const secret = symmetricDecrypt(user.twoFactorSecret, process.env.CALENDSO_ENCRYPTION_KEY);
        if (secret.length !== 32) {
          console.error(
            `Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`
          );
          throw new Error(ErrorCode.InternalServerError);
        }

        const isValidToken = authenticator.check(input.totpCode, secret);
        if (!isValidToken) {
          throw new Error(ErrorCode.IncorrectTwoFactorCode);
        }
        // If user has 2fa enabled, check if input.totpCode is correct
        // If it is, delete the user from stripe and database

        // Remove me from Stripe
        await deleteStripeCustomer(user).catch(console.warn);

        // Remove my account
        const deletedUser = await ctx.prisma.user.delete({
          where: {
            id: ctx.user.id,
          },
        });
        // Sync Services
        syncServicesDeleteWebUser(deletedUser);
      }

      return;
    },
  })
  .mutation("away", {
    input: z.object({
      away: z.boolean(),
    }),
    async resolve({ input, ctx }) {
      await ctx.prisma.user.update({
        where: {
          email: ctx.user.email,
        },
        data: {
          away: input.away,
        },
      });
    },
  })
  .query("eventTypes", {
    async resolve({ ctx }) {
      const { prisma } = ctx;
      const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
        hashedLink: true,
        destinationCalendar: true,
        team: true,
        metadata: true,
        users: {
          select: baseUserSelect,
        },
        ...baseEventTypeSelect,
      });

      const user = await prisma.user.findUnique({
        where: {
          id: ctx.user.id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          startTime: true,
          endTime: true,
          bufferTime: true,
          plan: true,
          teams: {
            where: {
              accepted: true,
            },
            select: {
              role: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  members: {
                    select: {
                      userId: true,
                    },
                  },
                  eventTypes: {
                    select: eventTypeSelect,
                    orderBy: [
                      {
                        position: "desc",
                      },
                      {
                        id: "asc",
                      },
                    ],
                  },
                },
              },
            },
          },
          eventTypes: {
            where: {
              team: null,
            },
            select: eventTypeSelect,
            orderBy: [
              {
                position: "desc",
              },
              {
                id: "asc",
              },
            ],
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const mapEventType = (eventType: typeof user.eventTypes[number]) => ({
        ...eventType,
        // @FIXME: cc @hariombalhara This is failing with production data
        // metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
      });

      const userEventTypes = user.eventTypes.map(mapEventType);
      // backwards compatibility, TMP:
      const typesRaw = (
        await prisma.eventType.findMany({
          where: {
            userId: ctx.user.id,
          },
          select: eventTypeSelect,
          orderBy: [
            {
              position: "desc",
            },
            {
              id: "asc",
            },
          ],
        })
      ).map(mapEventType);

      type EventTypeGroup = {
        teamId?: number | null;
        profile: {
          slug: typeof user["username"];
          name: typeof user["name"];
        };
        metadata: {
          membershipCount: number;
          readOnly: boolean;
        };
        eventTypes: typeof userEventTypes;
      };

      let eventTypeGroups: EventTypeGroup[] = [];
      const eventTypesHashMap = userEventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
        const oldItem = hashMap[newItem.id];
        hashMap[newItem.id] = { ...oldItem, ...newItem };
        return hashMap;
      }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
      const mergedEventTypes = Object.values(eventTypesHashMap).map((eventType) => eventType);
      eventTypeGroups.push({
        teamId: null,
        profile: {
          slug: user.username,
          name: user.name,
        },
        eventTypes: _.orderBy(mergedEventTypes, ["position", "id"], ["desc", "asc"]),
        metadata: {
          membershipCount: 1,
          readOnly: false,
        },
      });

      eventTypeGroups = ([] as EventTypeGroup[]).concat(
        eventTypeGroups,
        user.teams.map((membership) => ({
          teamId: membership.team.id,
          profile: {
            name: membership.team.name,
            image: membership.team.logo || "",
            slug: "team/" + membership.team.slug,
          },
          metadata: {
            membershipCount: membership.team.members.length,
            readOnly: membership.role === MembershipRole.MEMBER,
          },
          eventTypes: membership.team.eventTypes.map(mapEventType),
        }))
      );
      return {
        viewer: {
          plan: user.plan,
        },
        // don't display event teams without event types,
        eventTypeGroups: eventTypeGroups.filter((groupBy) => !!groupBy.eventTypes?.length),
        // so we can show a dropdown when the user has teams
        profiles: eventTypeGroups.map((group) => ({
          teamId: group.teamId,
          ...group.profile,
          ...group.metadata,
        })),
      };
    },
  })
  .query("bookings", {
    input: z.object({
      status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]),
      limit: z.number().min(1).max(100).nullish(),
      cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
    }),
    async resolve({ ctx, input }) {
      // using offset actually because cursor pagination requires a unique column
      // for orderBy, but we don't use a unique column in our orderBy
      const take = input.limit ?? 10;
      const skip = input.cursor ?? 0;
      const { prisma, user } = ctx;
      const bookingListingByStatus = input.status;
      const bookingListingFilters: Record<typeof bookingListingByStatus, Prisma.BookingWhereInput> = {
        upcoming: {
          endTime: { gte: new Date() },
          // These changes are needed to not show confirmed recurring events,
          // as rescheduling or cancel for recurring event bookings should be
          // handled separately for each occurrence
          OR: [
            {
              recurringEventId: { not: null },
              status: { notIn: [BookingStatus.PENDING, BookingStatus.CANCELLED, BookingStatus.REJECTED] },
            },
            {
              recurringEventId: { equals: null },
              status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
            },
          ],
        },
        recurring: {
          endTime: { gte: new Date() },
          AND: [
            { NOT: { recurringEventId: { equals: null } } },
            { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] } },
          ],
        },
        past: {
          endTime: { lte: new Date() },
          AND: [
            { NOT: { status: { equals: BookingStatus.CANCELLED } } },
            { NOT: { status: { equals: BookingStatus.REJECTED } } },
          ],
        },
        cancelled: {
          OR: [
            { status: { equals: BookingStatus.CANCELLED } },
            { status: { equals: BookingStatus.REJECTED } },
          ],
        },
        unconfirmed: {
          endTime: { gte: new Date() },
          OR: [
            {
              recurringEventId: { not: null },
              status: { equals: BookingStatus.PENDING },
            },
            {
              status: { equals: BookingStatus.PENDING },
            },
          ],
        },
      };
      const bookingListingOrderby: Record<
        typeof bookingListingByStatus,
        Prisma.BookingOrderByWithAggregationInput
      > = {
        upcoming: { startTime: "asc" },
        recurring: { startTime: "asc" },
        past: { startTime: "desc" },
        cancelled: { startTime: "desc" },
        unconfirmed: { startTime: "asc" },
      };
      const passedBookingsFilter = bookingListingFilters[bookingListingByStatus];
      const orderBy = bookingListingOrderby[bookingListingByStatus];

      const bookingsQuery = await prisma.booking.findMany({
        where: {
          OR: [
            {
              userId: user.id,
            },
            {
              attendees: {
                some: {
                  email: user.email,
                },
              },
            },
            {
              eventType: {
                team: {
                  members: {
                    some: {
                      userId: user.id,
                      role: "OWNER",
                    },
                  },
                },
              },
            },
          ],
          AND: [passedBookingsFilter],
        },
        select: {
          ...bookingMinimalSelect,
          uid: true,
          recurringEventId: true,
          location: true,
          eventType: {
            select: {
              slug: true,
              id: true,
              eventName: true,
              price: true,
              recurringEvent: true,
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
          status: true,
          paid: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          rescheduled: true,
        },
        orderBy,
        take: take + 1,
        skip,
      });

      const recurringInfo = await prisma.booking.groupBy({
        by: ["recurringEventId"],
        _min: {
          startTime: true,
        },
        _count: {
          recurringEventId: true,
        },
        where: {
          recurringEventId: {
            not: { equals: null },
          },
          status: {
            notIn: [BookingStatus.CANCELLED],
          },
          userId: user.id,
        },
      });

      const bookings = bookingsQuery.map((booking) => {
        return {
          ...booking,
          eventType: {
            ...booking.eventType,
            recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
          },
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
        };
      });

      const bookingsFetched = bookings.length;
      let nextCursor: typeof skip | null = skip;
      if (bookingsFetched > take) {
        nextCursor += bookingsFetched;
      } else {
        nextCursor = null;
      }

      return {
        bookings,
        recurringInfo,
        nextCursor,
      };
    },
  })
  .query("connectedCalendars", {
    async resolve({ ctx }) {
      const { user } = ctx;
      // get user's credentials + their connected integrations
      const calendarCredentials = getCalendarCredentials(user.credentials);

      // get all the connected integrations' calendars (from third party)
      const connectedCalendars = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);

      if (connectedCalendars.length === 0) {
        /* As there are no connected calendars, delete the destination calendar if it exists */
        if (user.destinationCalendar) {
          await ctx.prisma.destinationCalendar.delete({
            where: { userId: user.id },
          });
          user.destinationCalendar = null;
        }
      } else if (!user.destinationCalendar) {
        /*
        There are connected calendars, but no destination calendar
        So create a default destination calendar with the first primary connected calendar
        */
        const { integration = "", externalId = "", credentialId } = connectedCalendars[0].primary ?? {};
        user.destinationCalendar = await ctx.prisma.destinationCalendar.create({
          data: {
            userId: user.id,
            integration,
            externalId,
            credentialId,
          },
        });
      } else {
        /* There are connected calendars and a destination calendar */

        // Check if destinationCalendar exists in connectedCalendars
        const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();
        const destinationCal = allCals.find(
          (cal) =>
            cal.externalId === user.destinationCalendar?.externalId &&
            cal.integration === user.destinationCalendar?.integration
        );
        if (!destinationCal) {
          // If destinationCalendar is out of date, update it with the first primary connected calendar
          const { integration = "", externalId = "" } = connectedCalendars[0].primary ?? {};
          user.destinationCalendar = await ctx.prisma.destinationCalendar.update({
            where: { userId: user.id },
            data: {
              integration,
              externalId,
            },
          });
        }
      }

      return {
        connectedCalendars,
        destinationCalendar: user.destinationCalendar,
      };
    },
  })
  .mutation("setDestinationCalendar", {
    input: z.object({
      integration: z.string(),
      externalId: z.string(),
      eventTypeId: z.number().nullish(),
      bookingId: z.number().nullish(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const { integration, externalId, eventTypeId } = input;
      const calendarCredentials = getCalendarCredentials(user.credentials);
      const connectedCalendars = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);
      const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();

      const credentialId = allCals.find(
        (cal) => cal.externalId === externalId && cal.integration === integration && cal.readOnly === false
      )?.credentialId;

      if (!credentialId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Could not find calendar ${input.externalId}` });
      }

      let where;

      if (eventTypeId) where = { eventTypeId };
      else where = { userId: user.id };

      await ctx.prisma.destinationCalendar.upsert({
        where,
        update: {
          integration,
          externalId,
          credentialId,
        },
        create: {
          ...where,
          integration,
          externalId,
          credentialId,
        },
      });
    },
  })
  .query("integrations", {
    input: z.object({
      variant: z.string().optional(),
      exclude: z.array(z.string()).optional(),
      onlyInstalled: z.boolean().optional(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const { variant, exclude, onlyInstalled } = input;
      const { credentials } = user;
      let apps = getApps(credentials).map(
        ({ credentials: _, credential: _1 /* don't leak to frontend */, ...app }) => ({
          ...app,
          credentialIds: credentials.filter((c) => c.type === app.type).map((c) => c.id),
        })
      );
      if (exclude) {
        // exclusion filter
        apps = apps.filter((item) => (exclude ? !exclude.includes(item.variant) : true));
      }
      if (variant) {
        // `flatMap()` these work like `.filter()` but infers the types correctly
        apps = apps
          // variant check
          .flatMap((item) => (item.variant.startsWith(variant) ? [item] : []));
      }
      if (onlyInstalled) {
        apps = apps.flatMap((item) => (item.credentialIds.length > 0 || item.isGlobal ? [item] : []));
      }
      return {
        items: apps,
      };
    },
  })
  .query("appById", {
    input: z.object({
      appId: z.string(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const appId = input.appId;
      const { credentials } = user;
      const apps = getApps(credentials);
      const appFromDb = apps.find((app) => app.slug === appId);
      if (!appFromDb) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Could not find app ${appId}` });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { credential: _, credentials: _1, ...app } = appFromDb;
      return {
        isInstalled: appFromDb.credentials.length,
        ...app,
      };
    },
  })
  .query("apps", {
    input: z.object({
      extendsFeature: z.literal("EventType"),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const { credentials } = user;

      const apps = getApps(credentials);
      return apps
        .filter((app) => app.extendsFeature?.includes(input.extendsFeature))
        .map((app) => ({
          ...app,
          isInstalled: !!app.credentials.length,
        }));
    },
  })

  .query("appCredentialsByType", {
    input: z.object({
      appType: z.string(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      return user.credentials.filter((app) => app.type == input.appType).map((credential) => credential.id);
    },
  })
  .query("stripeCustomer", {
    async resolve({ ctx }) {
      const {
        user: { id: userId },
        prisma,
      } = ctx;

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          metadata: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });
      }

      const metadata = userMetadata.parse(user.metadata);
      const checkoutSessionId = metadata?.checkoutSessionId;
      //TODO: Rename checkoutSessionId to premiumUsernameCheckoutSessionId
      if (!checkoutSessionId) return { isPremium: false };

      const { stripeCustomer, checkoutSession } = await getCustomerAndCheckoutSession(checkoutSessionId);
      if (!stripeCustomer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stripe User not found" });
      }

      return {
        isPremium: true,
        paidForPremium: checkoutSession.payment_status === "paid",
        username: stripeCustomer.metadata.username,
      };
    },
  })
  .mutation("updateProfile", {
    input: z.object({
      username: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      timeZone: z.string().optional(),
      weekStart: z.string().optional(),
      hideBranding: z.boolean().optional(),
      allowDynamicBooking: z.boolean().optional(),
      brandColor: z.string().optional(),
      darkBrandColor: z.string().optional(),
      theme: z.string().optional().nullable(),
      completedOnboarding: z.boolean().optional(),
      locale: z.string().optional(),
      timeFormat: z.number().optional(),
      disableImpersonation: z.boolean().optional(),
    }),
    async resolve({ input, ctx }) {
      const { user, prisma } = ctx;
      const data: Prisma.UserUpdateInput = {
        ...input,
      };
      let isPremiumUsername = false;
      if (input.username) {
        const username = slugify(input.username);
        // Only validate if we're changing usernames
        if (username !== user.username) {
          data.username = username;
          const response = await checkUsername(username);
          isPremiumUsername = response.premium;
          if (!response.available) {
            throw new TRPCError({ code: "BAD_REQUEST", message: response.message });
          }
        }
      }
      if (input.avatar) {
        data.avatar = await resizeBase64Image(input.avatar);
      }
      const userToUpdate = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });

      if (!userToUpdate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const metadata = userMetadata.parse(userToUpdate.metadata);
      // Checking the status of payment directly from stripe allows to avoid the situation where the user has got the refund or maybe something else happened asyncly at stripe but our DB thinks it's still paid for
      // TODO: Test the case where one time payment is refunded.
      const premiumUsernameCheckoutSessionId = metadata?.checkoutSessionId;
      if (premiumUsernameCheckoutSessionId) {
        const checkoutSession = await stripe.checkout.sessions.retrieve(premiumUsernameCheckoutSessionId);
        const canUserHavePremiumUsername = checkoutSession.payment_status == "paid";

        if (isPremiumUsername && !canUserHavePremiumUsername) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You need to pay for premium username",
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data,
        select: {
          id: true,
          username: true,
          email: true,
          metadata: true,
          name: true,
          plan: true,
          createdDate: true,
        },
      });

      // Sync Services
      await syncServicesUpdateWebUser(updatedUser);

      // Notify stripe about the change
      if (updatedUser && updatedUser.metadata && hasKeyInMetadata(updatedUser, "stripeCustomerId")) {
        const stripeCustomerId = `${updatedUser.metadata.stripeCustomerId}`;
        await stripe.customers.update(stripeCustomerId, {
          metadata: {
            username: updatedUser.username,
            email: updatedUser.email,
            userId: updatedUser.id,
          },
        });
      }
    },
  })
  .mutation("eventTypeOrder", {
    input: z.object({
      ids: z.array(z.number()),
    }),
    async resolve({ input, ctx }) {
      const { prisma, user } = ctx;
      const allEventTypes = await ctx.prisma.eventType.findMany({
        select: {
          id: true,
        },
        where: {
          id: {
            in: input.ids,
          },
          OR: [
            {
              userId: user.id,
            },
            {
              users: {
                some: {
                  id: user.id,
                },
              },
            },
            {
              team: {
                members: {
                  some: {
                    userId: user.id,
                  },
                },
              },
            },
          ],
        },
      });
      const allEventTypeIds = new Set(allEventTypes.map((type) => type.id));
      if (input.ids.some((id) => !allEventTypeIds.has(id))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
      await Promise.all(
        _.reverse(input.ids).map((id, position) => {
          return prisma.eventType.update({
            where: {
              id,
            },
            data: {
              position,
            },
          });
        })
      );
    },
  })
  .mutation("eventTypePosition", {
    input: z.object({
      eventType: z.number(),
      action: z.string(),
    }),
    async resolve({ input, ctx }) {
      // This mutation is for the user to be able to order their event types by incrementing or decrementing the position number
      const { prisma } = ctx;
      if (input.eventType && input.action == "increment") {
        await prisma.eventType.update({
          where: {
            id: input.eventType,
          },
          data: {
            position: {
              increment: 1,
            },
          },
        });
      }

      if (input.eventType && input.action == "decrement") {
        await prisma.eventType.update({
          where: {
            id: input.eventType,
          },
          data: {
            position: {
              decrement: 1,
            },
          },
        });
      }
    },
  })
  .query("showSAMLView", {
    input: z.object({
      teamsView: z.boolean(),
      teamId: z.union([z.number(), z.null(), z.undefined()]),
    }),
    async resolve({ input, ctx }) {
      const { user } = ctx;
      const { teamsView, teamId } = input;

      if ((teamsView && !hostedCal) || (!teamsView && hostedCal)) {
        return {
          isSAMLLoginEnabled: false,
          hostedCal,
        };
      }

      let enabled = isSAMLLoginEnabled;

      // in teams view we already check for isAdmin
      if (teamsView) {
        enabled = enabled && user.plan === "PRO";
      } else {
        enabled = enabled && isSAMLAdmin(user.email);
      }

      let provider;
      if (enabled) {
        const { apiController } = await jackson();

        try {
          const resp = await apiController.getConfig({
            tenant: teamId ? tenantPrefix + teamId : samlTenantID,
            product: samlProductID,
          });
          provider = resp.provider;
        } catch (err) {
          console.error("Error getting SAML config", err);
          throw new TRPCError({ code: "BAD_REQUEST", message: "SAML configuration fetch failed" });
        }
      }

      return {
        isSAMLLoginEnabled: enabled,
        hostedCal,
        provider,
      };
    },
  })
  .mutation("updateSAMLConfig", {
    input: z.object({
      encodedRawMetadata: z.string(),
      teamId: z.union([z.number(), z.null(), z.undefined()]),
    }),
    async resolve({ ctx, input }) {
      const { encodedRawMetadata, teamId } = input;
      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { apiController } = await jackson();

      try {
        return await apiController.config({
          encodedRawMetadata,
          defaultRedirectUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/auth/saml/idp`,
          redirectUrl: JSON.stringify([`${process.env.NEXT_PUBLIC_WEBAPP_URL}/*`]),
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });
      } catch (err) {
        console.error("Error setting SAML config", err);
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
    },
  })
  .mutation("deleteSAMLConfig", {
    input: z.object({
      teamId: z.union([z.number(), z.null(), z.undefined()]),
    }),
    async resolve({ ctx, input }) {
      const { teamId } = input;
      if (teamId && !(await isTeamOwner(ctx.user?.id, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

      const { apiController } = await jackson();

      try {
        return await apiController.deleteConfig({
          tenant: teamId ? tenantPrefix + teamId : samlTenantID,
          product: samlProductID,
        });
      } catch (err) {
        console.error("Error deleting SAML configuration", err);
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
    },
  })
  .mutation("submitFeedback", {
    input: z.object({
      rating: z.string(),
      comment: z.string(),
    }),
    async resolve({ input, ctx }) {
      const { rating, comment } = input;

      const feedback = {
        username: ctx.user.username || "Nameless",
        email: ctx.user.email || "No email address",
        rating: rating,
        comment: comment,
      };

      await ctx.prisma.feedback.create({
        data: {
          date: dayjs().toISOString(),
          userId: ctx.user.id,
          rating: rating,
          comment: comment,
        },
      });

      if (process.env.SEND_FEEDBACK_EMAIL && comment) sendFeedbackEmail(feedback);
    },
  })
  .query("locationOptions", {
    async resolve({ ctx }) {
      const credentials = await prisma.credential.findMany({
        where: {
          userId: ctx.user.id,
        },
        select: {
          id: true,
          type: true,
          key: true,
          userId: true,
          appId: true,
        },
      });

      const integrations = getApps(credentials);

      const t = await getTranslation(ctx.user.locale ?? "en", "common");

      const locationOptions = getLocationOptions(integrations, t);

      return locationOptions;
    },
  })
  .mutation("deleteCredential", {
    input: z.object({
      id: z.number(),
      externalId: z.string().optional(),
    }),
    async resolve({ input, ctx }) {
      const { id, externalId } = input;

      const credential = await prisma.credential.findFirst({
        where: {
          id: id,
          userId: ctx.user.id,
        },
        include: {
          app: {
            select: {
              slug: true,
              categories: true,
            },
          },
        },
      });

      if (!credential) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const eventTypes = await prisma.eventType.findMany({
        where: {
          userId: ctx.user.id,
        },
        select: {
          id: true,
          locations: true,
          destinationCalendar: true,
          price: true,
          currency: true,
          metadata: true,
        },
      });

      // TODO: Improve this uninstallation cleanup per event by keeping a relation of EventType to App which has the data.
      for (const eventType of eventTypes) {
        if (eventType.locations) {
          // If it's a video, replace the location with Cal video
          if (credential.app?.categories.includes(AppCategories.video)) {
            // Find the user's event types

            // Look for integration name from app slug
            const integrationQuery =
              credential.app?.slug === "msteams" ? "office365_video" : credential.app?.slug.split("-")[0];

            // Check if the event type uses the deleted integration

            // To avoid type errors, need to stringify and parse JSON to use array methods
            const locationsSchema = z.array(z.object({ type: z.string() }));
            const locations = locationsSchema.parse(eventType.locations);

            const updatedLocations = locations.map((location: { type: string }) => {
              if (location.type.includes(integrationQuery)) {
                return { type: DailyLocationType };
              }
              return location;
            });

            await prisma.eventType.update({
              where: {
                id: eventType.id,
              },
              data: {
                locations: updatedLocations,
              },
            });
          }
        }

        // If it's a calendar, remove the destination calendar from the event type
        if (credential.app?.categories.includes(AppCategories.calendar)) {
          if (eventType.destinationCalendar?.integration === credential.type) {
            const destinationCalendar = await prisma.destinationCalendar.findFirst({
              where: {
                id: eventType.destinationCalendar?.id,
              },
            });
            if (destinationCalendar) {
              await prisma.destinationCalendar.delete({
                where: {
                  id: destinationCalendar.id,
                },
              });
            }
          }

          if (externalId) {
            const existingSelectedCalendar = await prisma.selectedCalendar.findFirst({
              where: {
                externalId: externalId,
              },
            });
            // @TODO: SelectedCalendar doesn't have unique ID so we should only delete one item
            if (existingSelectedCalendar) {
              await prisma.selectedCalendar.delete({
                where: {
                  userId_integration_externalId: {
                    userId: existingSelectedCalendar.userId,
                    externalId: existingSelectedCalendar.externalId,
                    integration: existingSelectedCalendar.integration,
                  },
                },
              });
            }
          }
        }

        const metadata = EventTypeMetaDataSchema.parse(eventType.metadata);

        const stripeAppData = getStripeAppData({ ...eventType, metadata });

        // If it's a payment, hide the event type and set the price to 0. Also cancel all pending bookings
        if (credential.app?.categories.includes(AppCategories.payment)) {
          if (stripeAppData.price) {
            await prisma.$transaction(async () => {
              await prisma.eventType.update({
                where: {
                  id: eventType.id,
                },
                data: {
                  hidden: true,
                  metadata: {
                    ...metadata,
                    apps: {
                      ...metadata?.apps,
                      stripe: {
                        ...metadata?.apps?.stripe,
                        price: 0,
                      },
                    },
                  },
                },
              });

              // Assuming that all bookings under this eventType need to be paid
              const unpaidBookings = await prisma.booking.findMany({
                where: {
                  userId: ctx.user.id,
                  eventTypeId: eventType.id,
                  status: "PENDING",
                  paid: false,
                  payment: {
                    every: {
                      success: false,
                    },
                  },
                },
                select: {
                  ...bookingMinimalSelect,
                  recurringEventId: true,
                  userId: true,
                  user: {
                    select: {
                      id: true,
                      credentials: true,
                      email: true,
                      timeZone: true,
                      name: true,
                      destinationCalendar: true,
                      locale: true,
                    },
                  },
                  location: true,
                  references: {
                    select: {
                      uid: true,
                      type: true,
                      externalCalendarId: true,
                    },
                  },
                  payment: true,
                  paid: true,
                  eventType: {
                    select: {
                      recurringEvent: true,
                      title: true,
                    },
                  },
                  uid: true,
                  eventTypeId: true,
                  destinationCalendar: true,
                },
              });

              for (const booking of unpaidBookings) {
                await prisma.booking.update({
                  where: {
                    id: booking.id,
                  },
                  data: {
                    status: BookingStatus.CANCELLED,
                    cancellationReason: "Payment method removed",
                  },
                });

                for (const payment of booking.payment) {
                  // Right now we only close payments on Stripe
                  const stripeKeysSchema = z.object({
                    stripe_user_id: z.string(),
                  });
                  const { stripe_user_id } = stripeKeysSchema.parse(credential.key);
                  await closePayments(payment.externalId, stripe_user_id);
                  await prisma.payment.delete({
                    where: {
                      id: payment.id,
                    },
                  });
                }

                await prisma.attendee.deleteMany({
                  where: {
                    bookingId: booking.id,
                  },
                });

                await prisma.bookingReference.deleteMany({
                  where: {
                    bookingId: booking.id,
                  },
                });

                const attendeesListPromises = booking.attendees.map(async (attendee) => {
                  return {
                    name: attendee.name,
                    email: attendee.email,
                    timeZone: attendee.timeZone,
                    language: {
                      translate: await getTranslation(attendee.locale ?? "en", "common"),
                      locale: attendee.locale ?? "en",
                    },
                  };
                });

                const attendeesList = await Promise.all(attendeesListPromises);
                const tOrganizer = await getTranslation(booking?.user?.locale ?? "en", "common");

                await sendCancelledEmails({
                  type: booking?.eventType?.title as string,
                  title: booking.title,
                  description: booking.description,
                  customInputs: isPrismaObjOrUndefined(booking.customInputs),
                  startTime: booking.startTime.toISOString(),
                  endTime: booking.endTime.toISOString(),
                  organizer: {
                    email: booking?.user?.email as string,
                    name: booking?.user?.name ?? "Nameless",
                    timeZone: booking?.user?.timeZone as string,
                    language: { translate: tOrganizer, locale: booking?.user?.locale ?? "en" },
                  },
                  attendees: attendeesList,
                  uid: booking.uid,
                  recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
                  location: booking.location,
                  destinationCalendar: booking.destinationCalendar || booking.user?.destinationCalendar,
                  cancellationReason: "Payment method removed by organizer",
                });
              }
            });
          }
        }
      }

      // if zapier get disconnected, delete zapier apiKey, delete zapier webhooks and cancel all scheduled jobs from zapier
      if (credential.app?.slug === "zapier") {
        await prisma.apiKey.deleteMany({
          where: {
            userId: ctx.user.id,
            appId: "zapier",
          },
        });
        await prisma.webhook.deleteMany({
          where: {
            appId: "zapier",
          },
        });
        const bookingsWithScheduledJobs = await prisma.booking.findMany({
          where: {
            userId: ctx.user.id,
            scheduledJobs: {
              isEmpty: false,
            },
          },
        });
        for (const booking of bookingsWithScheduledJobs) {
          cancelScheduledJobs(booking, credential.appId);
        }
      }

      // Validated that credential is user's above
      await prisma.credential.delete({
        where: {
          id: id,
        },
      });
    },
  })
  .query("bookingUnconfirmedCount", {
    async resolve({ ctx }) {
      const { prisma, user } = ctx;
      const count = await prisma.booking.count({
        where: {
          status: BookingStatus.PENDING,
          userId: user.id,
          endTime: { gt: new Date() },
        },
      });
      const recurringGrouping = await prisma.booking.groupBy({
        by: ["recurringEventId"],
        _count: {
          recurringEventId: true,
        },
        where: {
          recurringEventId: { not: { equals: null } },
          status: { equals: "PENDING" },
          userId: user.id,
          endTime: { gt: new Date() },
        },
      });
      return recurringGrouping.reduce((prev, current) => {
        // recurringEventId is the total number of recurring instances for a booking
        // we need to substract all but one, to represent a single recurring booking
        return prev - (current._count?.recurringEventId - 1);
      }, count);
    },
  });

export const viewerRouter = createRouter()
  .merge("public.", publicViewerRouter)
  .merge(loggedInViewerRouter)
  .merge("auth.", authRouter)
  .merge("bookings.", bookingsRouter)
  .merge("eventTypes.", eventTypesRouter)
  .merge("availability.", availabilityRouter)
  .merge("teams.", viewerTeamsRouter)
  .merge("webhook.", webhookRouter)
  .merge("apiKeys.", apiKeysRouter)
  .merge("slots.", slotsRouter)
  .merge("workflows.", workflowsRouter)

  // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
  // After that there would just one merge call here for all the apps.
  .merge("app_routing_forms.", app_RoutingForms)
  .merge("eth.", ethRouter);
