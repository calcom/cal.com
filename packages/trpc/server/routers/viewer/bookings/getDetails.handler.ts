import {
  getBookingDetailsForViewer,
  type GetEventTypesFromDBFn,
} from "@calcom/features/bookings/lib/getBookingDetailsForViewer";
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

  // Cast getEventTypesFromDB to the expected type - the branded bookingFields array
  // from getBookingFieldsWithSystemFields is structurally compatible with the base type
  const getEventTypesFromDBTyped = getEventTypesFromDB as GetEventTypesFromDBFn;

  const result = await getBookingDetailsForViewer(
    {
      prisma,
      uid,
      seatReferenceUid,
      eventTypeSlug,
      userId: user.id,
    },
    {
      getEventTypesFromDB: getEventTypesFromDBTyped,
      handleSeatsEventTypeOnBooking,
      getRecurringBookings,
    }
  );

  return result;
};
