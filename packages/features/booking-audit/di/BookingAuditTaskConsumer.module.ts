import { moduleLoader as auditActorRepositoryModuleLoader } from "@calcom/features/booking-audit/di/AuditActorRepository.module";
import { moduleLoader as bookingAuditRepositoryModuleLoader } from "@calcom/features/booking-audit/di/BookingAuditRepository.module";
import { BOOKING_AUDIT_DI_TOKENS } from "@calcom/features/booking-audit/di/tokens";
import { BookingAuditTaskConsumer } from "@calcom/features/booking-audit/lib/service/BookingAuditTaskConsumer";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedTeamFeatureRepository.module";
import { bindModuleToClassOnToken, createModule } from "../../di/di";

export const bookingAuditTaskConsumerModule = createModule();
const token = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASK_CONSUMER;
const moduleToken = BOOKING_AUDIT_DI_TOKENS.BOOKING_AUDIT_TASK_CONSUMER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: bookingAuditTaskConsumerModule,
  moduleToken,
  token,
  classs: BookingAuditTaskConsumer,
  depsMap: {
    bookingAuditRepository: bookingAuditRepositoryModuleLoader,
    auditActorRepository: auditActorRepositoryModuleLoader,
    teamFeatureRepository: cachedTeamFeatureRepositoryModuleLoader,
    userRepository: userRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
