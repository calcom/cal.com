import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { FilterHostsService } from "../../bookings/filterHostsBySameRoundRobinHost";
import { createContainer } from "../di";
import { bookingRepositoryModule } from "../modules/Booking";
import { filterHostsModule } from "../modules/FilterHosts";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.FILTER_HOSTS_SERVICE_MODULE, filterHostsModule);

export function getFilterHostsService() {
  return container.get<FilterHostsService>(DI_TOKENS.FILTER_HOSTS_SERVICE);
}
