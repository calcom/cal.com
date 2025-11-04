import { PrismaBookingAuditRepository } from "@calcom/features/booking-audit/lib/repository/PrismaBookingAuditRepository";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { type Container, createModule } from "../../di/di";

export const bookingAuditRepositoryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY_MODULE;
bookingAuditRepositoryModule.bind(token).toClass(PrismaBookingAuditRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(moduleToken, bookingAuditRepositoryModule);
  },
};
