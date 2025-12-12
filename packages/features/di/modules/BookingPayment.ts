import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyBookingPaymentRepository } from "@calcom/lib/server/repository/KyselyBookingPaymentRepository";

import { DI_TOKENS } from "../tokens";

export const bookingPaymentRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.BOOKING_PAYMENT_REPOSITORY)
    .toInstance(new KyselyBookingPaymentRepository(kyselyRead, kyselyWrite));
  return module;
};
