import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { createModule } from "@evyweb/ioctopus";

export const bookingRepositoryModule = createModule();
bookingRepositoryModule
  .bind(DI_TOKENS.BOOKING_REPOSITORY)
  .toClass(BookingRepository, [DI_TOKENS.PRISMA_CLIENT]);
