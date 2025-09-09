import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { RegularBookingService } from "../modules/RegularBookingServiceModule";
import {
  regularBookingServiceModule,
  loadModuleDeps,
  moduleToken,
} from "../modules/RegularBookingServiceModule";

const regularBookingServiceContainer = createContainer();

regularBookingServiceContainer.load(DI_TOKENS.REGULAR_BOOKING_SERVICE_MODULE, regularBookingServiceModule);

export function getRegularBookingService(): RegularBookingService {
  loadModuleDeps(regularBookingServiceContainer);

  return regularBookingServiceContainer.get<RegularBookingService>(moduleToken);
}
