import { createModule } from "@evyweb/ioctopus";

import type { IAvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";
import { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { DI_TOKENS } from "../tokens";

export const availableSlotsModule = createModule();
availableSlotsModule.bind(DI_TOKENS.AVAILABLE_SLOTS_SERVICE).toClass(AvailableSlotsService, {
  oooRepo: DI_TOKENS.OOO_REPOSITORY,
  scheduleRepo: DI_TOKENS.SCHEDULE_REPOSITORY,
  selectedSlotRepo: DI_TOKENS.SELECTED_SLOT_REPOSITORY,
  teamRepo: DI_TOKENS.TEAM_REPOSITORY,
  userRepo: DI_TOKENS.USER_REPOSITORY,
  bookingRepo: DI_TOKENS.BOOKING_REPOSITORY,
  eventTypeRepo: DI_TOKENS.EVENT_TYPE_REPOSITORY,
  routingFormResponseRepo: DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY,
} satisfies Record<keyof IAvailableSlotsService, symbol>);
