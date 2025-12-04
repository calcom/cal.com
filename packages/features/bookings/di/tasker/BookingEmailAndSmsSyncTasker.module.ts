import { BookingEmailAndSmsSyncTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsSyncTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";

import { moduleLoader as BookingEmailAndSmsTaskServiceModuleLoader } from "./BookingEmailAndSmsTaskService.module";
import { BOOKING_EMAIL_SMS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_SYNC_TASKER;
const moduleToken = BOOKING_EMAIL_SMS_TASKER_DI_TOKENS.BOOKING_EMAIL_SMS_SYNC_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingEmailAndSmsSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    bookingTaskService: BookingEmailAndSmsTaskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
