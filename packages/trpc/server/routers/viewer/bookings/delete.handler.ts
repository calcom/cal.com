import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;
  const { user } = ctx;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      endTime: true,
      userId: true,
      eventType: {
        select: {
          id: true,
          teamId: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const isBookingInPast = new Date(booking.endTime) < new Date();

  if (!isBookingInPast) {
    throw new Error("Only past bookings can be deleted");
  }

  const isOrganizer = booking.userId === user.id;

  if (!isOrganizer) {
    const teamId = booking.eventType?.teamId ?? null;
    const isAdmin = teamId && (await isTeamAdmin(user.id, teamId));

    if (!isAdmin) {
      throw new Error("Unauthorized: You don't have permission to delete this booking");
    }
  }

  await prisma.booking.delete({
    where: { id },
  });
};
