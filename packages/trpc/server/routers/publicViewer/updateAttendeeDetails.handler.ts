import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TUpdateAttendeeDetailsInputSchema } from "./updateAttendeeDetails.schema";

type UpdateAttendeeDetailsOptions = {
  input: TUpdateAttendeeDetailsInputSchema;
};

type UpdateAttendeeDetailsResult = {
  success: boolean;
  attendee: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string | null;
    timeZone: string;
  };
};

async function findAndValidateBooking(bookingUid: string, currentEmail: string) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    select: {
      id: true,
      status: true,
      attendees: {
        where: {
          email: currentEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          timeZone: true,
        },
      },
    },
  });

  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found",
    });
  }

  if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit details for a cancelled booking",
    });
  }

  const attendee = booking.attendees[0];

  if (!attendee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Attendee not found for this booking",
    });
  }

  return { booking, attendee };
}

export const updateAttendeeDetailsHandler = async ({
  input,
}: UpdateAttendeeDetailsOptions): Promise<UpdateAttendeeDetailsResult> => {
  const { bookingUid, currentEmail, name, email, phoneNumber, timeZone } = input;

  // Check if at least one field is being updated
  if (!name && !email && !phoneNumber && !timeZone) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one field must be provided to update",
    });
  }

  // Find the booking and attendee
  const { attendee } = await findAndValidateBooking(bookingUid, currentEmail);

  // Build the update data object with only provided fields
  const updateData: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    timeZone?: string;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (timeZone !== undefined) updateData.timeZone = timeZone;

  // Update the attendee
  const updatedAttendee = await prisma.attendee.update({
    where: {
      id: attendee.id,
    },
    data: updateData,
  });

  return {
    success: true,
    attendee: {
      id: updatedAttendee.id,
      name: updatedAttendee.name,
      email: updatedAttendee.email,
      phoneNumber: updatedAttendee.phoneNumber,
      timeZone: updatedAttendee.timeZone,
    },
  };
};

export default updateAttendeeDetailsHandler;
