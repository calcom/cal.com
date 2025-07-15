import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { BookingRepository } from "@calcom/lib/server/repository/bookingRepository";

export const bookingRepositoryModule = createModule();
bookingRepositoryModule
  .bind(DI_TOKENS.BOOKING_REPOSITORY)
  .toClass(BookingRepository, [DI_TOKENS.PRISMA_CLIENT]);
