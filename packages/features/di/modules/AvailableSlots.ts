import { FLAGS_DI_TOKENS } from "@calcom/features/flags/di/tokens";
import type { IAvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";
import { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";
import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const availableSlotsModule = createModule();
availableSlotsModule.bind(DI_TOKENS.AVAILABLE_SLOTS_SERVICE).toClass(AvailableSlotsService, {
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  scheduleRepo: DI_TOKENS.SCHEDULE_REPOSITORY,
  selectedSlotRepo: DI_TOKENS.SELECTED_SLOT_REPOSITORY,
  teamRepo: DI_TOKENS.TEAM_REPOSITORY,
  userRepo: DI_TOKENS.USER_REPOSITORY,
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  eventTypeRepo: DI_TOKENS.EVENT_TYPE_REPOSITORY,
  routingFormResponseRepo: DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY,
  redisClient: DI_TOKENS.REDIS_CLIENT,
  checkBookingLimitsService: DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE,
  userAvailabilityService: DI_TOKENS.GET_USER_AVAILABILITY_SERVICE,
  busyTimesService: DI_TOKENS.BUSY_TIMES_SERVICE,
  teamFeatureRepository: FLAGS_DI_TOKENS.CACHED_TEAM_FEATURE_REPOSITORY,
  qualifiedHostsService: DI_TOKENS.QUALIFIED_HOSTS_SERVICE,
  noSlotsNotificationService: DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE,
  orgMembershipLookup: DI_TOKENS.ORG_MEMBERSHIP_LOOKUP,
} satisfies Record<keyof IAvailableSlotsService, symbol>);
