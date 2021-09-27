import { TRPCError } from "@trpc/server";
import { z } from "zod";

import checkPremiumUsername from "@ee/lib/core/checkUsername";

import checkRegularUsername from "@lib/core/checkUsername";
import slugify from "@lib/slugify";

import { createProtectedRouter } from "../createRouter";

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
    async resolve({ ctx }) {
      const { prisma, user } = ctx;
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
        orderBy: {
          startTime: "asc",
        },
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
  .mutation("updateProfile", {
    input: z.object({
      username: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      avatar: z.string().optional(),
      timeZone: z.string().optional(),
      weekStart: z.string().optional(),
      hideBranding: z.boolean().optional(),
      theme: z.string().optional(),
      completedOnboarding: z.boolean().optional(),
      locale: z.string().optional(),
    }),
    async resolve({ input, ctx }) {
      const { user, prisma } = ctx;
      const { name, avatar, timeZone, weekStart, hideBranding, theme, completedOnboarding, locale } = input;
      let username: string | undefined = undefined;

      if (input.username) {
        username = slugify(input.username);
        // Only validate if we're changing usernames
        if (username !== user.username) {
          const response = await checkUsername(username);
          if (response.status !== 200) {
            const { message } = await response.json();
            throw new TRPCError({ code: "BAD_REQUEST", message });
          }
        }
      }

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          username,
          name,
          avatar,
          timeZone,
          weekStart,
          hideBranding,
          theme,
          completedOnboarding,
          locale,
          bio: input.description,
        },
      });
    },
  });
