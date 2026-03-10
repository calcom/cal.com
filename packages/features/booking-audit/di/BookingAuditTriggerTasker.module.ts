import { BookingAuditTriggerTasker } from "@calcom/features/booking-audit/lib/tasker/BookingAuditTriggerTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { BOOKING_AUDIT_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TRIGGER_TASKER;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TRIGGER_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAuditTriggerTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
