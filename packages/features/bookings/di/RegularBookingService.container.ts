import { createContainer } from "@calcom/features/di/di";
import {
  type RegularBookingService,
  moduleLoader as regularBookingServiceModule,
} from "./RegularBookingService.module";

const regularBookingServiceContainer = createContainer();

export function getRegularBookingService(): RegularBookingService {
  regularBookingServiceModule.loadModule(regularBookingServiceContainer);

  return regularBookingServiceContainer.get<RegularBookingService>(regularBookingServiceModule.token);
}
