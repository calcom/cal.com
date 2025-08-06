import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { getUserAvailabilityModule } from "../modules/get-user-availability";
import { bookingRepositoryModule } from "../modules/booking";

import { eventTypeRepositoryModule } from "../modules/eventType";
import { redisModule } from "@calcom/features/redis/di/redisModule";

import { oooRepositoryModule } from "../modules/ooo";
import { UserAvailabilityService } from "../../getUserAvailability";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.REDIS_CLIENT, redisModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE, eventTypeRepositoryModule);
container.load(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE_MODULE, getUserAvailabilityModule);

export function getUserAvailabilityService() {
  return container.get<UserAvailabilityService>(DI_TOKENS.GET_USER_AVAILABILITY_SERVICE);
}
