import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { RegularBookingService } from "../modules/RegularBookingServiceModule";
import {
  regularBookingServiceModule,
  loadModule as loadRegularBookingServiceModule,
  token as regularBookingServiceToken,
} from "../modules/RegularBookingServiceModule";

const regularBookingServiceContainer = createContainer();

regularBookingServiceContainer.load(DI_TOKENS.REGULAR_BOOKING_SERVICE_MODULE, regularBookingServiceModule);

export function getRegularBookingService(): RegularBookingService {
  loadRegularBookingServiceModule(regularBookingServiceContainer);

  return regularBookingServiceContainer.get<RegularBookingService>(regularBookingServiceToken);
}
