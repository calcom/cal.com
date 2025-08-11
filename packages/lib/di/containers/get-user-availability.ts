import { createContainer } from "@evyweb/ioctopus";

import { redisModule } from "@calcom/features/redis/di/redisModule";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { UserAvailabilityService } from "../../getUserAvailability";
import { bookingRepositoryModule } from "../modules/booking";
import { busyTimesModule } from "../modules/busy-times";
import { eventTypeRepositoryModule } from "../modules/eventType";
import { getUserAvailabilityModule } from "../modules/get-user-availability";
import { oooRepositoryModule } from "../modules/ooo";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE, eventTypeRepositoryModule);
container.load(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE_MODULE, getUserAvailabilityModule);
container.load(DI_TOKENS.BUSY_TIMES_SERVICE_MODULE, busyTimesModule);
container.load(DI_TOKENS.REDIS_CLIENT, redisModule);

export function getUserAvailabilityService() {
  return container.get<UserAvailabilityService>(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE);
}
