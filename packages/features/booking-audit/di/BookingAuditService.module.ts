import { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as auditActorRepositoryModuleLoader } from "@calcom/features/booking-audit/di/AuditActorRepository.module";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditServiceModule,
  moduleToken,
  token,
  classs: BookingAuditService,
  depsMap: {
    bookingAuditRepository: bookingAuditRepositoryModuleLoader,
    actorRepository: auditActorRepositoryModuleLoader,
  },
});

export { BookingAuditService }
export const moduleLoader = {
  token,
  loadModule
};
