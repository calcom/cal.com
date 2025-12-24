import { BookingAuditTaskerProducerService } from "@calcom/features/booking-audit/lib/service/BookingAuditTaskerProducerService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as taskerModuleLoader } from "@calcom/features/di/shared/services/tasker.service";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as auditActorRepositoryModuleLoader } from "@calcom/features/booking-audit/di/AuditActorRepository.module";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditProducerServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_PRODUCER_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_PRODUCER_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditProducerServiceModule,
  moduleToken,
  token,
  classs: BookingAuditTaskerProducerService,
  depsMap: {
    tasker: taskerModuleLoader,
    log: loggerModuleLoader,
    auditActorRepository: auditActorRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule
};
