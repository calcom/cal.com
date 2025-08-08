import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { BusyTimesService } from "../../getBusyTimes";
import { bookingRepositoryModule } from "../modules/booking";
import { busyTimesModule } from "../modules/busy-times";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.BUSY_TIMES_SERVICE_MODULE, busyTimesModule);

export function getBusyTimesService() {
  return container.get<BusyTimesService>(DI_TOKENS.BUSY_TIMES_SERVICE);
}
