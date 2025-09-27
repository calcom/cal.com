// eslint-disable-next-line no-restricted-imports
import { BookingCancelService } from "@calcom/features/bookings/lib/handleCancelBooking";
// eslint-disable-next-line no-restricted-imports
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { bindModuleToClassOnToken, createModule } from "../../di";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_CANCEL_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_CANCEL_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingCancelService,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};

export type { BookingCancelService };
