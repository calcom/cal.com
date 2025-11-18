import { BookingAuditViewerService } from "@calcom/features/booking-audit/lib/service/BookingAuditViewerService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditViewerServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_VIEWER_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_VIEWER_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditViewerServiceModule,
  moduleToken,
  token,
  classs: BookingAuditViewerService,
  depsMap: {
    bookingAuditRepository: bookingAuditRepositoryModuleLoader,
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule
};

