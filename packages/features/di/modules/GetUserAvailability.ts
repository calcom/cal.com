import type { IUserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const getUserAvailabilityModule = createModule();
getUserAvailabilityModule.bind(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE).toClass(UserAvailabilityService, {
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  eventTypeRepo: DI_TOKENS.EVENT_TYPE_REPOSITORY,
  redisClient: DI_TOKENS.REDIS_CLIENT,
  holidayRepo: DI_TOKENS.HOLIDAY_REPOSITORY,
} satisfies Record<keyof IUserAvailabilityService, symbol>);
