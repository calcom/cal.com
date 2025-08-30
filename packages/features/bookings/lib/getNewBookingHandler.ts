// eslint-disable-next-line no-restricted-imports
import type { BookingDataSchemaGetter } from "@calcom/features/bookings/lib/dto/types";
import type { BookingHandlerInput } from "@calcom/features/bookings/lib/dto/types";
import prisma from "@calcom/prisma";

async function handler(input: BookingHandlerInput, schemaGetter?: BookingDataSchemaGetter) {
  const { default: getBookingDataSchema } = await import("./getBookingDataSchema");
  const { getCheckBookingAndDurationLimitsService } = await import("@calcom/lib/di/containers/BookingLimits");
  const { getCacheService } = await import("@calcom/lib/di/containers/Cache");
  const { BookingRepository } = await import("@calcom/lib/server/repository/booking");
  const { legacyHandler } = await import("./service/BookingCreateService");

  const bookingRepository = new BookingRepository(prisma);

  return legacyHandler(input, schemaGetter, {
    cacheService: getCacheService(),
    checkBookingAndDurationLimitsService: getCheckBookingAndDurationLimitsService(),
    prisma: prisma,
    bookingRepository,
  });
}

export function getNewBookingHandler() {
  return handler;
}
