import dayjs from "@calcom/dayjs";
import { ensureAvailableUsers } from "@calcom/features/bookings/lib/handleNewBooking";
import logger from "@calcom/lib/logger";
import { getLuckyUser } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TRoundRobinReassignInputSchema } from "./roundRobinReassign.schema";

type RoundRobinReassignOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRoundRobinReassignInputSchema;
};

export const roundRobinReassignHandler = async ({ ctx, input }: RoundRobinReassignOptions) => {
  const { eventTypeId, bookingId } = input;

  const roundRobinReassignLogger = logger.getSubLogger({
    prefix: ["roundRobinReassign", `${bookingId}`],
  });
  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      availability: true,
      hosts: {
        select: {
          user: {
            include: {
              schedules: {
                include: {
                  availability: true,
                },
              },
            },
          },
        },
      },
      users: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  eventType.users = eventType.hosts.map((host) => ({ ...host.user }));
  // console.log("🚀 ~ roundRobinReassignHandler ~ eventType.users:", eventType.users);

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      startTime: true,
      endTime: true,
      attendees: {
        select: {
          email: true,
        },
      },
    },
  });

  const availableUsers = await ensureAvailableUsers(
    eventType,
    {
      dateFrom: dayjs(booking.startTime).format(),
      dateTo: dayjs(booking.endTime).format(),
      timeZone: "",
    },
    roundRobinReassignLogger
  );
  // console.log("🚀 ~ roundRobinReassignHandler ~ availableUsers:", availableUsers);

  const luckyUser = await getLuckyUser("MAXIMIZE_AVAILABILITY", {
    availableUsers,
    eventTypeId: eventTypeId,
  });

  console.log("🚀 ~ roundRobinReassignHandler ~ luckyUser:", luckyUser);

  // See if user is the assigned user or an attendee
  if (booking.userId === ctx.user.id) {
    console.log("booking is connected to user");
  } else if (booking.attendees.some((attendee) => attendee.email === ctx.user.email)) {
    console.log("booking is connected to attendee");
  } else {
    console.log("user is not in the booking");
  }

  return;
};

export default roundRobinReassignHandler;
