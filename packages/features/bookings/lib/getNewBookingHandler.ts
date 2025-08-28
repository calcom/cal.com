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
  const { QuickEnrichmentService } = await import("./utils/phases/quickEnrichment");
  const { QuickValidationService } = await import("./utils/phases/quickValidation");
  const { DeepEnrichmentService } = await import("./utils/phases/deepEnrichment");
  const bookingRepository = new BookingRepository(prisma);

  return legacyHandler(input, {
    cacheService: getCacheService(),
    checkBookingAndDurationLimitsService: getCheckBookingAndDurationLimitsService(),
    prisma: prisma,
    bookingRepository,
    quickEnrichmentService: new QuickEnrichmentService(),
    quickValidationService: new QuickValidationService({
      bookingDataSchemaGetter: schemaGetter || getBookingDataSchema,
    }),
    deepEnrichmentService: new DeepEnrichmentService({
      prisma: prisma,
    }),
  });
}

export function getNewBookingHandler() {
  return handler;
}
