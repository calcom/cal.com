import type { BusyTimesService } from "@calcom/features/busyTimes/services/getBusyTimes";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { createContainer } from "../di";
import { bookingRepositoryModule } from "../modules/Booking";
import { busyTimesModule } from "../modules/BusyTimes";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.BUSY_TIMES_SERVICE_MODULE, busyTimesModule);

export function getBusyTimesService() {
  return container.get<BusyTimesService>(DI_TOKENS.BUSY_TIMES_SERVICE);
}
