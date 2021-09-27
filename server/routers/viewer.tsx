import { TRPCError } from "@trpc/server";

import { createRouter } from "../createRouter";

// routes only available to authenticated users
export const viewerRouter = createRouter()
  // check that user is authenticated
  .middleware(({ ctx, next }) => {
    const { user } = ctx;
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next({
      ctx: {
        ...ctx,
        // session value is known to be non-null now
        user,
      },
    });
  })
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
  });
