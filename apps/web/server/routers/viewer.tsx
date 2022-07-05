import { BookingStatus, MembershipRole, AppCategories, Prisma } from "@prisma/client";
import _ from "lodash";
import { JSONObject } from "superjson/dist/types";
import { z } from "zod";

import getApps, { getLocationOptions } from "@calcom/app-store/utils";
import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import dayjs from "@calcom/dayjs";
import { sendFeedbackEmail } from "@calcom/emails";
import { sendCancelledEmails } from "@calcom/emails";
import { parseRecurringEvent, isPrismaObjOrUndefined } from "@calcom/lib";
import { baseEventTypeSelect, bookingMinimalSelect } from "@calcom/prisma";
import { closePayments } from "@ee/lib/stripe/server";

import { checkUsername } from "@lib/core/server/checkUsername";
import jackson from "@lib/jackson";
import prisma from "@lib/prisma";
import { isTeamOwner } from "@lib/queries/teams";
import {
  hostedCal,
  isSAMLAdmin,
  isSAMLLoginEnabled,
  samlProductID,
  samlTenantID,
  samlTenantProduct,
  tenantPrefix,
} from "@lib/saml";
import slugify from "@lib/slugify";

import { getTranslation } from "@server/lib/i18n";
import { apiKeysRouter } from "@server/routers/viewer/apiKeys";
import { availabilityRouter } from "@server/routers/viewer/availability";
import { bookingsRouter } from "@server/routers/viewer/bookings";
import { eventTypesRouter } from "@server/routers/viewer/eventTypes";
import { slotsRouter } from "@server/routers/viewer/slots";
import { TRPCError } from "@trpc/server";

import { createProtectedRouter, createRouter } from "../createRouter";
import { resizeBase64Image } from "../lib/resizeBase64Image";
import { viewerTeamsRouter } from "./viewer/teams";
import { webhookRouter } from "./viewer/webhook";

// things that unauthenticated users can query about themselves
const publicViewerRouter = createRouter()
  .query("session", {
    resolve({ ctx }) {
      return ctx.session;
    },
  })
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
      };
    },
  })
  .mutation("deleteMe", {
    async resolve({ ctx }) {
      // Remove me from Stripe

      // Remove my account
      await ctx.prisma.user.delete({
        where: {
          id: ctx.user.id,
        },
      });
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
        position: true,
        successRedirectUrl: true,
        hashedLink: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true,
          },
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

      // backwards compatibility, TMP:
      const typesRaw = await prisma.eventType.findMany({
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
      });

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
        eventTypes: (typeof user.eventTypes[number] & { $disabled?: boolean })[];
      };

      let eventTypeGroups: EventTypeGroup[] = [];
      const eventTypesHashMap = user.eventTypes.concat(typesRaw).reduce((hashMap, newItem, currentIndex) => {
        const oldItem = hashMap[newItem.id] || {
          $disabled: user.plan === "FREE" && currentIndex > 0,
        };
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
          eventTypes: membership.team.eventTypes,
        }))
      );

      const canAddEvents = user.plan !== "FREE" || eventTypeGroups[0].eventTypes.length < 1;

      return {
        viewer: {
          canAddEvents,
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
      status: z.enum(["upcoming", "recurring", "past", "cancelled"]),
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
      const bookingListingFilters: Record<typeof bookingListingByStatus, Prisma.BookingWhereInput[]> = {
        upcoming: [
          {
            endTime: { gte: new Date() },
            // These changes are needed to not show confirmed recurring events,
            // as rescheduling or cancel for recurring event bookings should be
            // handled separately for each occurrence
            OR: [
              {
                AND: [
                  { NOT: { recurringEventId: { equals: null } } },
                  { NOT: { status: { equals: BookingStatus.PENDING } } },
                  { NOT: { status: { equals: BookingStatus.CANCELLED } } },
                  { NOT: { status: { equals: BookingStatus.REJECTED } } },
                ],
              },
              {
                AND: [
                  { recurringEventId: { equals: null } },
                  { NOT: { status: { equals: BookingStatus.CANCELLED } } },
                  { NOT: { status: { equals: BookingStatus.REJECTED } } },
                ],
              },
            ],
          },
        ],
        recurring: [
          {
            endTime: { gte: new Date() },
            AND: [
              { NOT: { recurringEventId: { equals: null } } },
              { NOT: { status: { equals: BookingStatus.CANCELLED } } },
              { NOT: { status: { equals: BookingStatus.REJECTED } } },
            ],
          },
        ],
        past: [
          {
            endTime: { lte: new Date() },
            AND: [
              { NOT: { status: { equals: BookingStatus.CANCELLED } } },
              { NOT: { status: { equals: BookingStatus.REJECTED } } },
            ],
          },
        ],
        cancelled: [
          {
            OR: [
              { status: { equals: BookingStatus.CANCELLED } },
              { status: { equals: BookingStatus.REJECTED } },
            ],
          },
        ],
      };
      const bookingListingOrderby: Record<
        typeof bookingListingByStatus,
        Prisma.BookingOrderByWithAggregationInput
      > = {
        upcoming: { startTime: "asc" },
        recurring: { startTime: "asc" },
        past: { startTime: "desc" },
        cancelled: { startTime: "desc" },
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
          ],
          AND: passedBookingsFilter,
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
            },
          },
          rescheduled: true,
        },
        orderBy,
        take: take + 1,
        skip,
      });

      const groupedRecurringBookings = await prisma.booking.groupBy({
        by: [Prisma.BookingScalarFieldEnum.recurringEventId],
        _count: true,
      });

      let bookings = bookingsQuery.map((booking) => {
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
      const seenBookings: Record<string, boolean> = {};

      // Remove duplicate recurring bookings for upcoming status.
      // Couldn't use distinct in query because the distinct column would be different for recurring and non recurring event.
      // We might be actually sending less then the limit, due to this filter
      // TODO: Figure out a way to fix it.
      if (bookingListingByStatus === "upcoming") {
        bookings = bookings.filter((booking) => {
          if (!booking.recurringEventId) {
            return true;
          }
          if (seenBookings[booking.recurringEventId]) {
            return false;
          }
          seenBookings[booking.recurringEventId] = true;
          return true;
        });
      }

      let nextCursor: typeof skip | null = skip;
      if (bookingsFetched > take) {
        nextCursor += bookingsFetched;
      } else {
        nextCursor = null;
      }

      return {
        bookings,
        groupedRecurringBookings,
        nextCursor,
      };
    },
  })
  .query("connectedCalendars", {
    async resolve({ ctx }) {
      const { user } = ctx;
      // get user's credentials + their connected integrations
      const calendarCredentials = getCalendarCredentials(user.credentials, user.id);

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
        const { integration = "", externalId = "" } = connectedCalendars[0].primary ?? {};
        user.destinationCalendar = await ctx.prisma.destinationCalendar.create({
          data: {
            userId: user.id,
            integration,
            externalId,
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
      eventTypeId: z.number().optional(),
      bookingId: z.number().optional(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const { integration, externalId, eventTypeId, bookingId } = input;
      const calendarCredentials = getCalendarCredentials(user.credentials, user.id);
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
      else if (bookingId) where = { bookingId };
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
  .mutation("enableOrDisableWeb3", {
    input: z.object({}),
    async resolve({ ctx }) {
      const { user } = ctx;
      const where = { userId: user.id, type: "metamask_web3" };

      const web3Credential = await ctx.prisma.credential.findFirst({
        where,
        select: {
          id: true,
          key: true,
        },
      });

      if (web3Credential) {
        const deleted = await ctx.prisma.credential.delete({
          where: {
            id: web3Credential.id,
          },
        });
        return {
          ...deleted,
          key: {
            ...(deleted.key as JSONObject),
            isWeb3Active: false,
          },
        };
      } else {
        return ctx.prisma.credential.create({
          data: {
            type: "metamask_web3",
            key: {
              isWeb3Active: true,
            } as unknown as Prisma.InputJsonObject,
            userId: user.id,
          },
        });
      }
    },
  })
  .query("integrations", {
    input: z.object({
      variant: z.string().optional(),
      onlyInstalled: z.boolean().optional(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const { variant, onlyInstalled } = input;
      const { credentials } = user;

      let apps = getApps(credentials).map(
        ({ credentials: _, credential: _1 /* don't leak to frontend */, ...app }) => ({
          ...app,
          credentialIds: credentials.filter((c) => c.type === app.type).map((c) => c.id),
        })
      );
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
  .query("web3Integration", {
    async resolve({ ctx }) {
      const { user } = ctx;

      const where = { userId: user.id, type: "metamask_web3" };

      const web3Credential = await ctx.prisma.credential.findFirst({
        where,
        select: {
          key: true,
        },
      });

      return {
        isWeb3Active: web3Credential ? (web3Credential.key as JSONObject).isWeb3Active : false,
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
      if (input.username) {
        const username = slugify(input.username);
        // Only validate if we're changing usernames
        if (username !== user.username) {
          data.username = username;
          const response = await checkUsername(username);
          if (!response.available) {
            throw new TRPCError({ code: "BAD_REQUEST", message: response.message });
          }
        }
      }
      if (input.avatar) {
        data.avatar = await resizeBase64Image(input.avatar);
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data,
      });
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
    }),
    async resolve({ input, ctx }) {
      const { id } = input;

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
        },
      });

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
                return { type: "integrations:daily" };
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

        // If it's a calendar, remove the destination claendar from the event type
        if (credential.app?.categories.includes(AppCategories.calendar)) {
          if (eventType.destinationCalendar?.integration === credential.type) {
            await prisma.destinationCalendar.delete({
              where: {
                id: eventType.destinationCalendar.id,
              },
            });
          }
        }

        // If it's a payment, hide the event type and set the price to 0. Also cancel all pending bookings
        if (credential.app?.categories.includes(AppCategories.payment)) {
          if (eventType.price) {
            await prisma.$transaction(async () => {
              await prisma.eventType.update({
                where: {
                  id: eventType.id,
                },
                data: {
                  hidden: true,
                  price: 0,
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

      // Validated that credential is user's above
      await prisma.credential.delete({
        where: {
          id: id,
        },
      });
    },
  });

export const viewerRouter = createRouter()
  .merge("public.", publicViewerRouter)
  .merge(loggedInViewerRouter)
  .merge("bookings.", bookingsRouter)
  .merge("eventTypes.", eventTypesRouter)
  .merge("availability.", availabilityRouter)
  .merge("teams.", viewerTeamsRouter)
  .merge("webhook.", webhookRouter)
  .merge("apiKeys.", apiKeysRouter);
