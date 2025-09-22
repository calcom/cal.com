import { createContainer } from "../../di";
import {
  type RecurringBookingService,
  moduleLoader as recurringBookingServiceModule,
} from "../modules/RecurringBookingService.module";

const container = createContainer();

export function getRecurringBookingService(): RecurringBookingService {
  recurringBookingServiceModule.loadModule(container);

  return container.get<RecurringBookingService>(recurringBookingServiceModule.token);
}
