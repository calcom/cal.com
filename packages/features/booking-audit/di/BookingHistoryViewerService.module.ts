import { BookingHistoryViewerService } from "@calcom/features/booking-audit/lib/service/BookingHistoryViewerService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditViewerServiceModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditViewerService.module";
import { moduleLoader as routingFormResponseRepositoryModuleLoader } from "@calcom/features/routing-forms/di/RoutingFormResponseRepository.module";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingHistoryViewerServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_HISTORY_VIEWER_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_HISTORY_VIEWER_SERVICE_MODULE;

export { BookingHistoryViewerService };

const loadModule = bindModuleToClassOnToken({
  module: bookingHistoryViewerServiceModule,
  moduleToken,
  token,
  classs: BookingHistoryViewerService,
  depsMap: {
    bookingAuditViewerService: bookingAuditViewerServiceModuleLoader,
    routingFormResponseRepository: routingFormResponseRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
