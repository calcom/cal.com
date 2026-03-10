import { BookingAuditTasker } from "@calcom/features/booking-audit/lib/tasker/BookingAuditTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as bookingAuditSyncTaskerModuleLoader } from "./BookingAuditSyncTasker.module";
import { moduleLoader as bookingAuditTriggerTaskerModuleLoader } from "./BookingAuditTriggerTasker.module";
import { BOOKING_AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASKER;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAuditTasker,
  depsMap: {
    logger: loggerServiceModule,
    syncTasker: bookingAuditSyncTaskerModuleLoader,
    asyncTasker: bookingAuditTriggerTaskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
