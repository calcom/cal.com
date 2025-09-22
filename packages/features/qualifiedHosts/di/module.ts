import { createModule } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { IQualifiedHostsService } from "../services/findQualifiedHostsWithDelegationCredentials";

export const qualifiedHostsModule = createModule();
qualifiedHostsModule.bind(DI_TOKENS.QUALIFIED_HOSTS_SERVICE).toClass(QualifiedHostsService, {
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  filterHostsService: DI_TOKENS.FILTER_HOSTS_SERVICE,
} satisfies Record<keyof IQualifiedHostsService, symbol>);
