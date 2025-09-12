import { RecurringBookingService } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { createModule } from "../../di";

export const recurringBookingServiceModule = createModule();

recurringBookingServiceModule.bind(DI_TOKENS.RECURRING_BOOKING_SERVICE).toClass(RecurringBookingService, {
  regularBookingService: DI_TOKENS.REGULAR_BOOKING_SERVICE,
});

export type { RecurringBookingService };
