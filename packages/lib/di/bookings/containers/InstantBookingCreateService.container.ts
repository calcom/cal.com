import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { createContainer } from "../../di";
import {
  type InstantBookingCreateService,
  instantBookingCreateServiceModule,
} from "../modules/InstantBookingCreateService.module";

const container = createContainer();
container.load(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE, instantBookingCreateServiceModule);

export function getInstantBookingCreateService(): InstantBookingCreateService {
  return container.get<InstantBookingCreateService>(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE);
}
