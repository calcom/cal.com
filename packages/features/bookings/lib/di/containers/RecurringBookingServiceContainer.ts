import { createContainer } from "@evyweb/ioctopus";

import type { RecurringBookingService } from "../modules/RecurringBookingServiceModule";
import {
  loadModule as loadRecurringBookingServiceModule,
  token as recurringBookingServiceToken,
} from "../modules/RecurringBookingServiceModule";
import {
  regularBookingServiceModule,
  moduleToken as regularBookingServiceModuleToken,
} from "../modules/RegularBookingServiceModule";

const container = createContainer();
container.load(regularBookingServiceModuleToken, regularBookingServiceModule);

export function getRecurringBookingService(): RecurringBookingService {
  loadRecurringBookingServiceModule(container);

  return container.get<RecurringBookingService>(recurringBookingServiceToken);
}
