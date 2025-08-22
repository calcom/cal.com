import { createModule } from "@evyweb/ioctopus";

import { InstantBookingCreateService } from "@calcom/features/bookings/lib/service/InstantBookingCreateService";

import { DI_TOKENS } from "../tokens";

export const instantBookingCreateModule = createModule();

instantBookingCreateModule
  .bind(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE)
  .toClass(InstantBookingCreateService, {
    prisma: DI_TOKENS.PRISMA_CLIENT,
  });
