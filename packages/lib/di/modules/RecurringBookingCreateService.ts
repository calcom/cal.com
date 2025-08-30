import { createModule } from "@evyweb/ioctopus";

import { RecurringBookingCreateService } from "@calcom/features/bookings/lib/service/RecurringBookingCreateService";

import { DI_TOKENS } from "../tokens";

export const recurringBookingCreateModule = createModule();

recurringBookingCreateModule
  .bind(DI_TOKENS.RECURRING_BOOKING_CREATE_SERVICE)
  .toClass(RecurringBookingCreateService, {
    bookingCreateService: DI_TOKENS.BOOKING_CREATE_SERVICE,
  });
