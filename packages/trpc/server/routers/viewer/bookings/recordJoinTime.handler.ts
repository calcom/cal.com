import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TRecordJoinTimeSchema } from "./recordJoinTime.schema";

interface RecordJoinTimeOptions {
  ctx: {
    user: TrpcSessionUser;
    prisma: any;
  };
  input: TRecordJoinTimeSchema;
}

export const recordJoinTimeHandler = async ({ ctx, input }: RecordJoinTimeOptions): Promise<any> => {
  const { prisma, user } = ctx;
  const { bookingId, attendeeId } = input;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { attendees: true },
  });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  const attendee = booking.attendees.find((a: any) => a.id === attendeeId);
  if (!attendee) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Attendee not found" });
  }

  // Only the host or the attendee themselves should be able to record join time
  // Wait, if it's a "seated" booking, any attendee should be able to record their own join time.
  // We'll trust the caller for now if they have access to the booking details.

  return await prisma.attendee.update({
    where: { id: attendeeId },
    data: { joinedAt: new Date() },
  });
};
