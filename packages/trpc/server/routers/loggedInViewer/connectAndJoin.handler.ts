import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TConnectAndJoinInputSchema } from "./connectAndJoin.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TConnectAndJoinInputSchema;
};

export const Handler = async ({ ctx, input }: Options) => {
  const { token } = input;
  const { user } = ctx;
  const isLoggedInUserPartOfOrg = !!user.organization.id;

  if (!isLoggedInUserPartOfOrg) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Logged in user is not member of Organization" });
  }

  const instantMeetingToken = await prisma.instantMeetingToken.findUnique({
    select: {
      expires: true,
      teamId: true,
      booking: {
        select: {
          id: true,
          status: true,
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    where: {
      token,
      team: {
        members: {
          some: {
            userId: user.id,
            accepted: true,
          },
        },
      },
    },
  });

  // Check if logged in user belong to current team
  if (!instantMeetingToken) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "token_not_found" });
  }

  if (!instantMeetingToken.booking?.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "token_invalid_expired" });
  }

  // Check if token has not expired
  if (instantMeetingToken.expires < new Date()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "token_invalid_expired" });
  }

  // Check if Booking is already accepted by any other user
  let isBookingAlreadyAcceptedBySomeoneElse = false;
  if (
    instantMeetingToken.booking.status === BookingStatus.ACCEPTED &&
    instantMeetingToken.booking?.user?.id !== user.id
  ) {
    isBookingAlreadyAcceptedBySomeoneElse = true;
  }

  // Update User in Booking
  const updatedBooking = await prisma.booking.update({
    where: {
      id: instantMeetingToken.booking.id,
    },
    data: {
      ...(isBookingAlreadyAcceptedBySomeoneElse
        ? { status: BookingStatus.ACCEPTED }
        : {
            status: BookingStatus.ACCEPTED,
            user: {
              connect: {
                id: user.id,
              },
            },
          }),
    },
    select: {
      location: true,
      metadata: true,
    },
  });

  const locationVideoCallUrl = bookingMetadataSchema.parse(updatedBooking.metadata || {})?.videoCallUrl;

  if (!locationVideoCallUrl) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "meeting_url_not_found" });
  }

  // TODO:
  // Send Email to all Attendees and Create Calendar Events

  return { isBookingAlreadyAcceptedBySomeoneElse, meetingUrl: locationVideoCallUrl };
};
