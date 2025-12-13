import { KyselyBookingAuditRepository } from "@calcom/features/booking-audit/lib/repository/KyselyBookingAuditRepository";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { bindModuleToClassOnToken } from "@calcom/features/di/di";
import { moduleLoader as kyselyModuleLoader } from "@calcom/features/di/modules/Kysely";
import { createModule } from "../../di/di";

export const bookingAuditRepositoryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: bookingAuditRepositoryModule,
  moduleToken,
  token,
  classs: KyselyBookingAuditRepository,
  depsMap: {
    kyselyRead: kyselyModuleLoader,
    kyselyWrite: kyselyModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
