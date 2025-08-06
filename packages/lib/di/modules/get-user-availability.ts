import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "../tokens";
import { IUserAvailabilityService, UserAvailabilityService } from "../../getUserAvailability";

export const getUserAvailabilityModule = createModule();
getUserAvailabilityModule.bind(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE).toClass(UserAvailabilityService, {
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  eventTypeRepo: DI_TOKENS.EVENT_TYPE_REPOSITORY,
  redisClient: DI_TOKENS.REDIS_CLIENT,
} satisfies Record<keyof IUserAvailabilityService, symbol>);
