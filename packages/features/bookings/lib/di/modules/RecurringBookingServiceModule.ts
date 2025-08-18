import { createModule } from "@evyweb/ioctopus";
import type { Container } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import {
  RecurringBookingService,
  type IRecurringBookingServiceDependencies,
} from "../../handleNewRecurringBooking";
import {
  token as regularBookingServiceToken,
  loadModule as loadRegularBookingServiceModule,
} from "./RegularBookingServiceModule";

const token = DI_TOKENS.RECURRING_BOOKING_SERVICE;
const moduleToken = DI_TOKENS.RECURRING_BOOKING_SERVICE_MODULE;
export const recurringBookingServiceModule = createModule();

recurringBookingServiceModule.bind(token).toClass(RecurringBookingService, {
  regularBookingService: regularBookingServiceToken,
} satisfies Record<keyof IRecurringBookingServiceDependencies, symbol>);

function loadModule(container: Container) {
  container.load(moduleToken, recurringBookingServiceModule);
  loadRegularBookingServiceModule(container);
}
export { loadModule, moduleToken, token };
export type { RecurringBookingService };
