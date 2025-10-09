import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { QualifiedHostsService } from "@calcom/lib/bookings/findQualifiedHostsWithDelegationCredentials";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { createContainer } from "../di";
import { bookingRepositoryModule } from "../modules/Booking";
import { filterHostsModule } from "../modules/FilterHosts";
import { qualifiedHostsModule } from "../modules/QualifiedHosts";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.FILTER_HOSTS_SERVICE_MODULE, filterHostsModule);
container.load(DI_TOKENS.QUALIFIED_HOSTS_SERVICE_MODULE, qualifiedHostsModule);

export function getQualifiedHostsService() {
  return container.get<QualifiedHostsService>(DI_TOKENS.QUALIFIED_HOSTS_SERVICE);
}
