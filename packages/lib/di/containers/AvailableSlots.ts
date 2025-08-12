import { createContainer } from "@evyweb/ioctopus";

import { redisModule } from "@calcom/features/redis/di/redisModule";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";
import type { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { availableSlotsModule } from "../modules/AvailableSlots";
import { bookingRepositoryModule } from "../modules/Booking";
import { busyTimesModule } from "../modules/BusyTimes";
import { cacheModule } from "../modules/Cache";
import { checkBookingLimitsModule } from "../modules/CheckBookingLimits";
import { eventTypeRepositoryModule } from "../modules/EventType";
import { featuresRepositoryModule } from "../modules/Features";
import { getUserAvailabilityModule } from "../modules/GetUserAvailability";
import { oooRepositoryModule } from "../modules/Ooo";
import { routingFormResponseRepositoryModule } from "../modules/RoutingFormResponse";
import { scheduleRepositoryModule } from "../modules/Schedule";
import { selectedSlotsRepositoryModule } from "../modules/SelectedSlots";
import { teamRepositoryModule } from "../modules/Team";
import { userRepositoryModule } from "../modules/User";

const container = createContainer();
container.load(DI_TOKENS.REDIS_CLIENT, redisModule);
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.SCHEDULE_REPOSITORY_MODULE, scheduleRepositoryModule);
container.load(DI_TOKENS.SELECTED_SLOT_REPOSITORY_MODULE, selectedSlotsRepositoryModule);
container.load(DI_TOKENS.TEAM_REPOSITORY_MODULE, teamRepositoryModule);
container.load(DI_TOKENS.USER_REPOSITORY_MODULE, userRepositoryModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE, eventTypeRepositoryModule);
container.load(DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY_MODULE, routingFormResponseRepositoryModule);
container.load(DI_TOKENS.FEATURES_REPOSITORY_MODULE, featuresRepositoryModule);
container.load(DI_TOKENS.CACHE_SERVICE_MODULE, cacheModule);
container.load(DI_TOKENS.CHECK_BOOKING_LIMITS_SERVICE_MODULE, checkBookingLimitsModule);
container.load(DI_TOKENS.AVAILABLE_SLOTS_SERVICE_MODULE, availableSlotsModule);
container.load(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE_MODULE, getUserAvailabilityModule);
container.load(DI_TOKENS.BUSY_TIMES_SERVICE_MODULE, busyTimesModule);

export function getAvailableSlotsService() {
  return container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
}
