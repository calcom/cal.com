import { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_AUDIT_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_AUDIT_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingAuditService,
  depsMap: {},
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { BookingAuditService };
