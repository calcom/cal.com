import type { IQualifiedHostsService } from "@calcom/features/bookings/lib/host-filtering/findQualifiedHostsWithDelegationCredentials";
import { QualifiedHostsService } from "@calcom/features/bookings/lib/host-filtering/findQualifiedHostsWithDelegationCredentials";

import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const qualifiedHostsModule = createModule();
qualifiedHostsModule.bind(DI_TOKENS.QUALIFIED_HOSTS_SERVICE).toClass(QualifiedHostsService, {
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  filterHostsService: DI_TOKENS.FILTER_HOSTS_SERVICE,
} satisfies Record<keyof IQualifiedHostsService, symbol>);
