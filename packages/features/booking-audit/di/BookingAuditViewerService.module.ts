import { BookingAuditViewerService } from "@calcom/features/booking-audit/lib/service/BookingAuditViewerService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditViewerServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_VIEWER_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_VIEWER_SERVICE_MODULE;

export { BookingAuditViewerService }

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditViewerServiceModule,
  moduleToken,
  token,
  classs: BookingAuditViewerService,
  depsMap: {
    bookingAuditRepository: bookingAuditRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
    bookingRepository: bookingRepositoryModuleLoader,
    membershipRepository: membershipRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule
};

