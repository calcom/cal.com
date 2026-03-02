import { BookingAuditActionServiceRegistry } from "@calcom/features/booking-audit/lib/service/BookingAuditActionServiceRegistry";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

const bookingAuditActionServiceRegistryModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_ACTION_SERVICE_REGISTRY;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_ACTION_SERVICE_REGISTRY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditActionServiceRegistryModule,
  moduleToken,
  token,
  classs: BookingAuditActionServiceRegistry,
  depsMap: {},
});

export const moduleLoader = {
  token,
  loadModule,
};
