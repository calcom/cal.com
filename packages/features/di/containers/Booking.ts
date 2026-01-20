import type { IBookingRepository } from "@calcom/features/bookings/repositories/IBookingRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { prismaModule } from "@calcom/features/di/modules/Prisma";

import { createContainer } from "../di";
import { bookingRepositoryModule } from "../modules/Booking";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);

export function getBookingRepository(): IBookingRepository {
  return container.get<IBookingRepository>(DI_TOKENS.BOOKING_REPOSITORY);
}
