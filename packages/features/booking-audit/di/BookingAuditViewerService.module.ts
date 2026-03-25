import { BookingAuditViewerService } from "@calcom/features/booking-audit/lib/service/BookingAuditViewerService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as attendeeRepositoryModuleLoader } from "@calcom/features/bookings/di/Attendee.module";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as credentialRepositoryModuleLoader } from "@calcom/features/credentials/di/CredentialRepository.module";

import { createModule, bindModuleToClassOnToken } from "../../di/di";

export const bookingAuditViewerServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_VIEWER_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_VIEWER_SERVICE_MODULE;

export { BookingAuditViewerService };

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
    attendeeRepository: attendeeRepositoryModuleLoader,
    log: loggerModuleLoader,
    credentialRepository: credentialRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
