import { createModule } from "@evyweb/ioctopus";

import type { IUserAvailabilityService } from "@calcom/lib/server/service/userAvailabilityService";
import { UserAvailabilityService } from "@calcom/lib/server/service/userAvailabilityService";

import { DI_TOKENS } from "../tokens";

export const userAvailabilityModule = createModule();
userAvailabilityModule.bind(DI_TOKENS.USER_AVAILABILITY_SERVICE).toClass(UserAvailabilityService, {
  eventTypeRepo: DI_TOKENS.EVENT_TYPE_REPOSITORY,
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  userRepo: DI_TOKENS.USER_REPOSITORY,
} satisfies Record<keyof IUserAvailabilityService, symbol>);
