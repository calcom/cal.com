import { createContainer } from "@calcom/lib/di/di";
import { bookingRepositoryModule } from "@calcom/lib/di/modules/Booking";
import { filterHostsModule } from "@calcom/lib/di/modules/FilterHosts";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";

import type { QualifiedHostsService } from "../services/findQualifiedHostsWithDelegationCredentials";
import { qualifiedHostsModule } from "./module";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.FILTER_HOSTS_SERVICE_MODULE, filterHostsModule);
container.load(DI_TOKENS.QUALIFIED_HOSTS_SERVICE_MODULE, qualifiedHostsModule);

export function getQualifiedHostsService() {
  return container.get<QualifiedHostsService>(DI_TOKENS.QUALIFIED_HOSTS_SERVICE);
}
