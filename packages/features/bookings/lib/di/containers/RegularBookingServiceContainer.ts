import { createContainer } from "@evyweb/ioctopus";

import type { RegularBookingService } from "../modules/RegularBookingServiceModule";
import { regularBookingServiceModule } from "../modules/RegularBookingServiceModule";

const regularBookingServiceContainer = createContainer();

export function getRegularBookingService(): RegularBookingService {
  regularBookingServiceModule.loadModule(regularBookingServiceContainer);

  return regularBookingServiceContainer.get<RegularBookingService>(regularBookingServiceModule.token);
}
