import { moduleLoader as loggerServiceModule } from "di/shared/services/logger.service";

import { BookingEmailAndSmsTriggerDevTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTriggerTasker";
import { bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";

import { BOOKING_EMAIL_SMS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_TRIGGER_TASKER;
const moduleToken = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_TRIGGER_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingEmailAndSmsTriggerDevTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
};
