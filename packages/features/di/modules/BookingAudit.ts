import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyBookingAuditRepository } from "../../booking-audit/lib/repository/KyselyBookingAuditRepository";
import { DI_TOKENS } from "../tokens";

export const bookingAuditRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.BOOKING_AUDIT_REPOSITORY)
    .toInstance(new KyselyBookingAuditRepository(kyselyRead, kyselyWrite));
  return module;
};
