import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { BookingRepository } from "@calcom/lib/server/repository/booking";

import { type Container, createModule } from "../di";

export const bookingRepositoryModule = createModule();
const token = DI_TOKENS.BOOKING_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REPOSITORY_MODULE;
bookingRepositoryModule.bind(token).toClass(BookingRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(moduleToken, bookingRepositoryModule);
  },
};
