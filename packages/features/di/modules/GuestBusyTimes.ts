import type { IGuestBusyTimesService } from "@calcom/features/busyTimes/services/getGuestBusyTimes";
import { GuestBusyTimesService } from "@calcom/features/busyTimes/services/getGuestBusyTimes";

import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const guestBusyTimesModule = createModule();
guestBusyTimesModule.bind(DI_TOKENS.GUEST_BUSY_TIMES_SERVICE).toClass(GuestBusyTimesService, {
  prisma: DI_TOKENS.PRISMA_CLIENT,
} satisfies Record<keyof IGuestBusyTimesService, symbol>);
