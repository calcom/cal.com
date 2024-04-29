import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAddGuestsInputSchema } from "./addGuests.schema";
import type { BookingsProcedureContext } from "./util";

type AddGuestsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TAddGuestsInputSchema;
};
export const addGuestsHandler = async ({ ctx, input }: AddGuestsOptions) => {
  const { bookingId, guests } = input;
  console.log(input);
  const { booking } = ctx;

  try {
    const organizer = await prisma.user.findFirstOrThrow({
      where: {
        id: booking.userId || 0,
      },
      select: {
        name: true,
        email: true,
        timeZone: true,
        locale: true,
      },
    });

    const guestsFullDetails = guests.map((guest) => {
      return {
        name: "",
        email: guest,
        timeZone: organizer.timeZone,
      };
    });

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      include: {
        attendees: true,
      },
      data: {
        attendees: {
          createMany: {
            data: guestsFullDetails,
          },
        },
      },
    });
  } catch (err) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    console.log(err);
  }
  return { message: "Guests updated" };
};
