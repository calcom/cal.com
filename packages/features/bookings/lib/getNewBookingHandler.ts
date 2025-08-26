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
  const { EnrichmentBeforeValidationService } = await import("./utils/phases/enrichmentBeforeValidation");
  const { BookingValidationService } = await import("./utils/phases/bookingValidation");
  const { AllowBookingService } = await import("./utils/phases/allowBooking");

  const bookingRepository = new BookingRepository(prisma);

  return legacyHandler(input, schemaGetter, {
    cacheService: getCacheService(),
    checkBookingAndDurationLimitsService: getCheckBookingAndDurationLimitsService(),
    prisma: prisma,
    bookingRepository,
    enrichmentBeforeValidationService: new EnrichmentBeforeValidationService(),
    bookingValidationService: new BookingValidationService({
      bookingDataSchemaGetter: schemaGetter || getBookingDataSchema,
    }),
    allowBookingService: new AllowBookingService({
      bookingRepository,
    }),
  });
}

export function getNewBookingHandler() {
  return handler;
}
