// eslint-disable-next-line no-restricted-imports
import { RecurringBookingService } from "@calcom/features/bookings/lib/handleNewRecurringBooking";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { createModule, bindModuleToClassOnToken } from "../../di";
import { moduleLoader as regularBookingServiceModuleLoader } from "./RegularBookingService.module";

const token = DI_TOKENS.RECURRING_BOOKING_SERVICE;
const moduleToken = DI_TOKENS.RECURRING_BOOKING_SERVICE_MODULE;
export const recurringBookingServiceModule = createModule();

const loadModule = bindModuleToClassOnToken({
  module: recurringBookingServiceModule,
  moduleToken,
  token,
  classs: RecurringBookingService,
  depsMap: {
    regularBookingService: regularBookingServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
export type { RecurringBookingService };
