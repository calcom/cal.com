import { getBookingDetailsForViewer } from "@calcom/features/bookings/lib/getBookingDetailsForViewer";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetDetailsInputSchema } from "./getDetails.schema";

type GetDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetDetailsInputSchema;
};

export const getDetailsHandler = async ({ ctx, input }: GetDetailsOptions) => {
  const { prisma, user } = ctx;
  const { uid, seatReferenceUid, eventTypeSlug } = input;

  const { getRecurringBookings, handleSeatsEventTypeOnBooking, getEventTypesFromDB } = await import(
    "@calcom/web/lib/booking"
  );

  const result = await getBookingDetailsForViewer(
    {
      prisma,
      uid,
      seatReferenceUid,
      eventTypeSlug,
      userId: user.id,
      userEmail: user.email,
      userOrgId: user.organizationId,
    },
    {
      getEventTypesFromDB,
      handleSeatsEventTypeOnBooking,
      getRecurringBookings,
    }
  );

  return result;
};
