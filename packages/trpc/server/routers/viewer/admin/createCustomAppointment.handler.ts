import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";

import type { TCreateCustomAppointmentInputSchema } from "./createCustomAppointment.schema";

type AdminCreateCustomAppointmentOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreateCustomAppointmentInputSchema;
};

export const createCustomAppointmentHandler = async ({
  ctx,
  input,
}: AdminCreateCustomAppointmentOptions) => {
  const { user, prisma } = ctx;

  // Double check admin role
  if (user.role !== "ADMIN") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Only system admins can create custom one-off appointments.",
    });
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: input.targetUserId },
    select: { id: true, email: true, timeZone: true },
  });

  if (!targetUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target user not found.",
    });
  }

  // Create the booking directly (no event type needed)
  const booking = await prisma.booking.create({
    data: {
      userId: targetUser.id,
      title: input.title,
      description: input.description,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      status: "ACCEPTED",
      location: input.location,
      responses: {},
      attendees: {
        create: input.attendees.map((attendee) => ({
          name: attendee.name,
          email: attendee.email,
          timeZone: targetUser.timeZone,
        })),
      },
    },
    include: {
      attendees: true,
    },
  });

  return {
    success: true,
    booking,
  };
};

export default createCustomAppointmentHandler;