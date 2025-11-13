import { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditRepository.module";
import { moduleLoader as actorRepositoryModuleLoader } from "@calcom/features/booking-audit/di/ActorRepository.module";

import { type Container, createModule } from "../../di/di";

export const bookingAuditServiceModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_SERVICE;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_SERVICE_MODULE;
bookingAuditServiceModule.bind(token).toClass(BookingAuditService, {
  bookingAuditRepository: BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_REPOSITORY,
  actorRepository: BOOKING_AUDIT_DI_TOKENS.ACTOR_REPOSITORY,
});

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    // Load repository modules first
    bookingAuditRepositoryModuleLoader.loadModule(container);
    actorRepositoryModuleLoader.loadModule(container);
    container.load(moduleToken, bookingAuditServiceModule);
  },
};

export type { BookingAuditService };
