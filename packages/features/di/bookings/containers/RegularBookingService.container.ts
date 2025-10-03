import { createContainer } from "../../di";
import {
  type RegularBookingService,
  regularBookingServiceModule,
} from "../modules/RegularBookingService.module";

const regularBookingServiceContainer = createContainer();

export function getRegularBookingService(): RegularBookingService {
  regularBookingServiceModule.loadModule(regularBookingServiceContainer);

  return regularBookingServiceContainer.get<RegularBookingService>(regularBookingServiceModule.token);
}
