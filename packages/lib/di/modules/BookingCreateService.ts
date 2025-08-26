import { createModule } from "@evyweb/ioctopus";

import getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService";
import { AllowBookingService } from "@calcom/features/bookings/lib/utils/phases/allowBooking";
import { BookingValidationService } from "@calcom/features/bookings/lib/utils/phases/bookingValidation";
import { EnrichmentBeforeValidationService } from "@calcom/features/bookings/lib/utils/phases/enrichmentBeforeValidation";

import { DI_TOKENS } from "../tokens";

export const bookingCreateModule = createModule();

// Bind dependencies
bookingCreateModule.bind(DI_TOKENS.BOOKING_DATA_SCHEMA_GETTER).toValue(getBookingDataSchema);

// Bind phase services
bookingCreateModule
  .bind(DI_TOKENS.ENRICHMENT_BEFORE_VALIDATION_SERVICE)
  .toClass(EnrichmentBeforeValidationService);

bookingCreateModule.bind(DI_TOKENS.BOOKING_VALIDATION_SERVICE).toClass(BookingValidationService, {
  bookingDataSchemaGetter: DI_TOKENS.BOOKING_DATA_SCHEMA_GETTER,
});

bookingCreateModule.bind(DI_TOKENS.ALLOW_BOOKING_SERVICE).toClass(AllowBookingService, {
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
});

// Bind main service with all dependencies
bookingCreateModule.bind(DI_TOKENS.BOOKING_CREATE_SERVICE).toClass(BookingCreateService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prisma: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
  enrichmentBeforeValidationService: DI_TOKENS.ENRICHMENT_BEFORE_VALIDATION_SERVICE,
  bookingValidationService: DI_TOKENS.BOOKING_VALIDATION_SERVICE,
  allowBookingService: DI_TOKENS.ALLOW_BOOKING_SERVICE,
});
