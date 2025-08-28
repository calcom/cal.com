import { createModule } from "@evyweb/ioctopus";

import getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import { BookingCreateService } from "@calcom/features/bookings/lib/service/BookingCreateService";
import { QuickEnrichmentService } from "@calcom/features/bookings/lib/utils/phases/quickEnrichment";
import { QuickValidationService } from "@calcom/features/bookings/lib/utils/phases/quickValidation";

import { DI_TOKENS } from "../tokens";

export const bookingCreateModule = createModule();

// Bind dependencies
bookingCreateModule.bind(DI_TOKENS.BOOKING_DATA_SCHEMA_GETTER).toValue(getBookingDataSchema);

// Bind phase services
bookingCreateModule.bind(DI_TOKENS.QUICK_ENRICHMENT_SERVICE).toClass(QuickEnrichmentService);

bookingCreateModule.bind(DI_TOKENS.QUICK_VALIDATION_SERVICE).toClass(QuickValidationService, {
  bookingDataSchemaGetter: DI_TOKENS.BOOKING_DATA_SCHEMA_GETTER,
});

// Bind main service with all dependencies
bookingCreateModule.bind(DI_TOKENS.BOOKING_CREATE_SERVICE).toClass(BookingCreateService, {
  cacheService: DI_TOKENS.CACHE_SERVICE,
  checkBookingAndDurationLimitsService: DI_TOKENS.CHECK_BOOKING_AND_DURATION_LIMITS_SERVICE,
  prisma: DI_TOKENS.PRISMA_CLIENT,
  bookingRepository: DI_TOKENS.BOOKING_REPOSITORY,
  quickEnrichmentService: DI_TOKENS.QUICK_ENRICHMENT_SERVICE,
  quickValidationService: DI_TOKENS.QUICK_VALIDATION_SERVICE,
});
