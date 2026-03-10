import { BookingAuditSyncTasker } from "@calcom/features/booking-audit/lib/tasker/BookingAuditSyncTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as bookingAuditTaskConsumerModuleLoader } from "./BookingAuditTaskConsumer.module";
import { BOOKING_AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_SYNC_TASKER;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAuditSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    bookingAuditTaskConsumer: bookingAuditTaskConsumerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
