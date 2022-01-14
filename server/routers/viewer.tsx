import { BookingStatus, MembershipRole, Prisma } from "@prisma/client";
import _ from "lodash";
import { z } from "zod";

import { checkPremiumUsername } from "@ee/lib/core/checkPremiumUsername";

import { checkRegularUsername } from "@lib/core/checkRegularUsername";
import { getCalendarCredentials, getConnectedCalendars } from "@lib/integrations/calendar/CalendarManager";
import { ALL_INTEGRATIONS } from "@lib/integrations/getIntegrations";
import jackson from "@lib/jackson";
import {
  isSAMLLoginEnabled,
  samlTenantID,
  samlProductID,
  isSAMLAdmin,
  hostedCal,
  tenantPrefix,
  samlTenantProduct,
} from "@lib/saml";
import slugify from "@lib/slugify";
import { Schedule } from "@lib/types/schedule";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter, createRouter } from "../createRouter";
import { resizeBase64Image } from "../lib/resizeBase64Image";
import { viewerTeamsRouter } from "./viewer/teams";
import { webhookRouter } from "./viewer/webhook";

const checkUsername =
  process.env.NEXT_PUBLIC_APP_URL === "https://cal.com" ? checkPremiumUsername : checkRegularUsername;

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
  });

// routes only available to authenticated users
const loggedInViewerRouter = createProtectedRouter()
  .query("me", {
    resolve({ ctx }) {
      const {
        // pick only the part we want to expose in the API
        id,
        name,
        username,
        email,
        startTime,
        endTime,
        bufferTime,
        locale,
        avatar,
        createdDate,
        completedOnboarding,
        twoFactorEnabled,
        identityProvider,
        brandColor,
        plan,
        away,
      } = ctx.user;
      const me = {
        id,
        name,
        username,
        email,
        startTime,
        endTime,
        bufferTime,
        locale,
        avatar,
        createdDate,
        completedOnboarding,
        twoFactorEnabled,
        identityProvider,
        brandColor,
        plan,
        away,
      };
      return me;
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
        id: true,
        title: true,
        description: true,
        length: true,
        schedulingType: true,
        slug: true,
        hidden: true,
        price: true,
        currency: true,
        position: true,
        users: {
          select: {
            id: true,
            avatar: true,
            name: true,
          },
        },
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
          avatar: true,
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
          image: typeof user["avatar"];
        };
        metadata: {
          membershipCount: number;
          readOnly: boolean;
        };
        eventTypes: (typeof user.eventTypes[number] & { $disabled?: boolean })[];
      };

      let eventTypeGroups: EventTypeGroup[] = [];
      const eventTypesHashMap = user.eventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
        const oldItem = hashMap[newItem.id] || {};
        hashMap[newItem.id] = { ...oldItem, ...newItem };
        return hashMap;
      }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
      const mergedEventTypes = Object.values(eventTypesHashMap).map((et, index) => ({
        ...et,
        $disabled: user.plan === "FREE" && index > 0,
      }));

      eventTypeGroups.push({
        teamId: null,
        profile: {
          slug: user.username,
          name: user.name,
          image: user.avatar,
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
      status: z.enum(["upcoming", "past", "cancelled"]),
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
            AND: [
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
        upcoming: { startTime: "desc" },
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
          uid: true,
          title: true,
          description: true,
          attendees: true,
          confirmed: true,
          rejected: true,
          id: true,
          startTime: true,
          endTime: true,
          eventType: {
            select: {
              price: true,
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
          status: true,
          paid: true,
        },
        orderBy,
        take: take + 1,
        skip,
      });

      const bookings = bookingsQuery.reverse().map((booking) => {
        return {
          ...booking,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
        };
      });

      let nextCursor: typeof skip | null = skip;
      if (bookings.length > take) {
        bookings.shift();
        nextCursor += bookings.length;
      } else {
        nextCursor = null;
      }

      return {
        bookings,
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

      return {
        connectedCalendars,
        destinationCalendar: user.destinationCalendar,
      };
    },
  })
  .mutation("setUserDestinationCalendar", {
    input: z.object({
      integration: z.string(),
      externalId: z.string(),
    }),
    async resolve({ ctx, input }) {
      const { user } = ctx;
      const userId = ctx.user.id;
      const calendarCredentials = getCalendarCredentials(user.credentials, user.id);
      const connectedCalendars = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);
      const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();

      if (
        !allCals.find((cal) => cal.externalId === input.externalId && cal.integration === input.integration)
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Could not find calendar ${input.externalId}` });
      }
      await ctx.prisma.destinationCalendar.upsert({
        where: {
          userId,
        },
        update: {
          ...input,
          userId,
        },
        create: {
          ...input,
          userId,
        },
      });
    },
  })
  .query("integrations", {
    async resolve({ ctx }) {
      const { user } = ctx;
      const { credentials } = user;

      function countActive(items: { credentialIds: unknown[] }[]) {
        return items.reduce((acc, item) => acc + item.credentialIds.length, 0);
      }
      const integrations = ALL_INTEGRATIONS.map((integration) => ({
        ...integration,
        credentialIds: credentials
          .filter((credential) => credential.type === integration.type)
          .map((credential) => credential.id),
      }));
      // `flatMap()` these work like `.filter()` but infers the types correctly
      const conferencing = integrations.flatMap((item) => (item.variant === "conferencing" ? [item] : []));
      const payment = integrations.flatMap((item) => (item.variant === "payment" ? [item] : []));
      const calendar = integrations.flatMap((item) => (item.variant === "calendar" ? [item] : []));

      return {
        conferencing: {
          items: conferencing,
          numActive: countActive(conferencing),
        },
        calendar: {
          items: calendar,
          numActive: countActive(calendar),
        },
        payment: {
          items: payment,
          numActive: countActive(payment),
        },
      };
    },
  })
  .query("availability", {
    async resolve({ ctx }) {
      const { prisma, user } = ctx;
      const availabilityQuery = await prisma.availability.findMany({
        where: {
          userId: user.id,
        },
      });
      const schedule = availabilityQuery.reduce(
        (schedule: Schedule, availability) => {
          availability.days.forEach((day) => {
            schedule[day].push({
              start: new Date(
                Date.UTC(
                  new Date().getUTCFullYear(),
                  new Date().getUTCMonth(),
                  new Date().getUTCDate(),
                  availability.startTime.getUTCHours(),
                  availability.startTime.getUTCMinutes()
                )
              ),
              end: new Date(
                Date.UTC(
                  new Date().getUTCFullYear(),
                  new Date().getUTCMonth(),
                  new Date().getUTCDate(),
                  availability.endTime.getUTCHours(),
                  availability.endTime.getUTCMinutes()
                )
              ),
            });
          });
          return schedule;
        },
        Array.from([...Array(7)]).map(() => [])
      );
      return {
        schedule,
        timeZone: user.timeZone,
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
      brandColor: z.string().optional(),
      theme: z.string().optional().nullable(),
      completedOnboarding: z.boolean().optional(),
      locale: z.string().optional(),
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
      rawMetadata: z.string(),
      teamId: z.union([z.number(), z.null(), z.undefined()]),
    }),
    async resolve({ input }) {
      const { rawMetadata, teamId } = input;

      const { apiController } = await jackson();

      try {
        return await apiController.config({
          rawMetadata,
          defaultRedirectUrl: `${process.env.BASE_URL}/api/auth/saml/idp`,
          redirectUrl: JSON.stringify([`${process.env.BASE_URL}/*`]),
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
    async resolve({ input }) {
      const { teamId } = input;

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
  });

export const viewerRouter = createRouter()
  .merge(publicViewerRouter)
  .merge(loggedInViewerRouter)
  .merge("teams.", viewerTeamsRouter)
  .merge("webhook.", webhookRouter);
