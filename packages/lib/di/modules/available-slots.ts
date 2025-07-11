import { createModule } from "@evyweb/ioctopus";

import type { IAvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";
import { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { DI_TOKENS } from "../tokens";

export const availableSlotsModule = createModule();
availableSlotsModule.bind(DI_TOKENS.AVAILABLE_SLOTS_SERVICE).toClass(AvailableSlotsService, {
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  scheduleRepo: DI_TOKENS.SCHEDULE_REPOSITORY,
} satisfies Record<keyof IAvailableSlotsService, symbol>);
