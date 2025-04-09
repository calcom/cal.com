import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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

  const booking = await prisma.booking.findFirst({
    where: {
      id: id,
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
    include: {
      attendees: true,
      references: true,
      payment: true,
      workflowReminders: true,
      eventType: {
        include: {
          team: {
            include: {
              members: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const isTeamEvent = booking.eventType?.team;

  if (booking.userId !== user.id) {
    if (isTeamEvent) {
      const isTeamAdmin = booking.eventType?.team?.members.some(
        (member) => member.userId === user.id && member.role === "ADMIN"
      );

      if (!isTeamAdmin) {
        throw new Error("Unauthorized: Only team admins can delete team event bookings");
      }
    } else {
      throw new Error("Unauthorized: You don't have permission to delete this booking");
    }
  }

  const { getAllDelegationCredentialsForUser } = await import("@calcom/lib/delegationCredential/server");
  const { deleteBookingRecordings } = await import("@calcom/features/bookings/lib/handleRecordings");

  const delegationCredentials = await getAllDelegationCredentialsForUser({ user });
  await deleteBookingRecordings(booking, delegationCredentials);

  await prisma.booking.delete({
    where: {
      id: booking.id,
    },
  });

  return {
    message: "Booking deleted successfully",
  };
};
