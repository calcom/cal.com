import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { InstantBookingCreateService } from "../modules/InstantBookingCreateServiceModule";
import { instantBookingCreateServiceModule } from "../modules/InstantBookingCreateServiceModule";

const container = createContainer();
container.load(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE_MODULE, instantBookingCreateServiceModule);

export function getInstantBookingCreateService(): InstantBookingCreateService {
  return container.get<InstantBookingCreateService>(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE);
}
