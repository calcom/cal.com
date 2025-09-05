import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { createModule } from "@evyweb/ioctopus";

import { RecurringBookingService } from "../../handleNewRecurringBooking";

export const recurringBookingServiceModule = createModule();

recurringBookingServiceModule.bind(DI_TOKENS.RECURRING_BOOKING_SERVICE).toClass(RecurringBookingService, {
  regularBookingService: DI_TOKENS.REGULAR_BOOKING_SERVICE,
});

export type { RecurringBookingService };
