import { BookingStatus, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { getErrorFromUnknown } from "pages/_error";
import { z } from "zod";

import { checkPremiumUsername } from "@ee/lib/core/checkPremiumUsername";

import { checkRegularUsername } from "@lib/core/checkRegularUsername";
import getIntegrations, { ALL_INTEGRATIONS } from "@lib/integrations/getIntegrations";
import slugify from "@lib/slugify";

import { getCalendarAdapterOrNull } from "../../lib/calendarClient";
import { createProtectedRouter } from "../createRouter";
import { resizeBase64Image } from "../lib/resizeBase64Image";

const checkUsername =
  process.env.NEXT_PUBLIC_APP_URL === "https://cal.com" ? checkPremiumUsername : checkRegularUsername;

// routes only available to authenticated users
export const viewerRouter = createProtectedRouter()
  .query("me", {
    resolve({ ctx }) {
      return ctx.user;
    },
  })
  .query("bookings", {
    input: z.object({
      status: z.enum(["upcoming", "past", "cancelled"]),
    }),
    async resolve({ ctx, input }) {
      const { prisma, user } = ctx;
      const bookingListingByStatus = input.status;
      const bookingListingFilters: Record<typeof bookingListingByStatus, Prisma.BookingWhereInput[]> = {
        upcoming: [{ endTime: { gte: new Date() }, NOT: { status: { equals: BookingStatus.CANCELLED } } }],
        past: [{ endTime: { lte: new Date() }, NOT: { status: { equals: BookingStatus.CANCELLED } } }],
        cancelled: [{ status: { equals: BookingStatus.CANCELLED } }],
      };
      const bookingListingOrderby: Record<typeof bookingListingByStatus, Prisma.BookingOrderByInput> = {
        upcoming: { startTime: "desc" },
        past: { startTime: "asc" },
        cancelled: { startTime: "asc" },
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
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
          status: true,
        },
        orderBy,
      });

      const bookings = bookingsQuery.reverse().map((booking) => {
        return {
          ...booking,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
        };
      });

      return bookings;
    },
  })
  .query("integrations", {
    async resolve({ ctx }) {
      const { user } = ctx;
      const { credentials } = user;
      const integrations = getIntegrations(credentials);

      function countActive(items: { credentials: unknown[] }[]) {
        return items.reduce((acc, item) => acc + item.credentials.length, 0);
      }
      const conferencing = integrations.flatMap((item) => (item.variant === "conferencing" ? [item] : []));
      const payment = integrations.flatMap((item) => (item.variant === "payment" ? [item] : []));
      const calendar = integrations.flatMap((item) => (item.variant === "calendar" ? [item] : []));

      // get user's credentials + their connected integrations
      const calendarCredentials = user.credentials
        .filter((credential) => credential.type.endsWith("_calendar"))
        .flatMap((credential) => {
          const integration = ALL_INTEGRATIONS.find((integration) => integration.type === credential.type);

          const adapter = getCalendarAdapterOrNull({
            ...credential,
            userId: user.id,
          });
          return integration && adapter && integration.variant === "calendar"
            ? [{ integration, credential, adapter }]
            : [];
        });

      // get all the connected integrations' calendars (from third party)
      const connectedCalendars = await Promise.all(
        calendarCredentials.map(async (item) => {
          const { adapter, integration, credential } = item;
          try {
            const _calendars = await adapter.listCalendars();
            const calendars = _calendars.map((cal) => ({
              ...cal,
              isSelected: !!user.selectedCalendars.find((selected) => selected.externalId === cal.externalId),
            }));
            const primary = calendars.find((item) => item.primary) ?? calendars[0];
            if (!primary) {
              return {
                integration,
                credentialId: credential.id,
                error: {
                  message: "No primary calendar found",
                },
              };
            }
            return {
              integration,
              credentialId: credential.id,
              primary,
              calendars,
            };
          } catch (_error) {
            const error = getErrorFromUnknown(_error);
            return {
              integration,
              error: {
                message: error.message,
              },
            };
          }
        })
      );
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
        connectedCalendars,
      };
    },
  })
  .mutation("updateProfile", {
    input: z.object({
      username: z.string().optional(),
      name: z.string().optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      timeZone: z.string().optional(),
      weekStart: z.string().optional(),
      hideBranding: z.boolean().optional(),
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
  });
