import { BookingEmailAndSmsTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";

import { moduleLoader as BookingEmailAndSmsSyncTasker } from "./BookingEmailAndSmsSyncTasker.module";
import { moduleLoader as BookingEmailAndSmsTriggerTasker } from "./BookingEmailAndSmsTriggerDevTasker.module";
import { BOOKING_EMAIL_SMS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_TASKER;
const moduleToken = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingEmailAndSmsTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: BookingEmailAndSmsTriggerTasker,
    syncTasker: BookingEmailAndSmsSyncTasker,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
